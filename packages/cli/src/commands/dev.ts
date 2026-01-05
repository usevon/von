import { type FSWatcher, watch } from "node:fs";
import { log, note, spinner } from "@clack/prompts";
import { TunnelManager } from "@/lib/tunnel";
import { Command } from "commander";
import pc from "picocolors";
import { registerTunnel } from "@/lib/api";
import { getConfigPath, loadConfig, requireAuth } from "@/lib/config";
import { formatError, validatePort } from "@/lib/helpers";
import type { TunnelInfo } from "@/lib/types";

export const dev = new Command("dev")
  .description("Start dev tunnel for local webhook testing")
  .option("-p, --port <port...>", "Local port(s) to forward to (max 3)")
  .option("-v, --verbose", "Show detailed request/response info")
  .action(async (options) => {
    const { token, config } = requireAuth();

    if (!options.port || options.port.length === 0) {
      log.error("Port is required. Usage: von dev -p <port>");
      return;
    }

    const ports: number[] = [];
    for (const p of options.port as string[]) {
      const port = validatePort(p);
      if (!port) return;
      ports.push(port);
    }

    if (ports.length > 3) {
      log.error("Maximum 3 ports allowed per organization");
      return;
    }

    const s = spinner();
    s.start("Registering tunnel(s)...");

    try {
      const tunnels: TunnelInfo[] = [];

      for (const port of ports) {
        const { tunnelId, tunnelUrl, wsUrl } = await registerTunnel(token, port);
        tunnels.push({ port, tunnelId, tunnelUrl, wsUrl });
      }

      s.stop(`${tunnels.length} tunnel${tunnels.length > 1 ? "s" : ""} ready`);

      note(
        tunnels
          .map((t) => `${pc.magenta(t.port.toString())}  ${t.tunnelUrl}`)
          .join("\n"),
        "Tunnels"
      );

      if (options.verbose) {
        log.info("Verbose mode enabled");
      }
      console.log(pc.dim("│\n│  Press Ctrl+C to stop\n"));

      await connectTunnels(
        token,
        tunnels,
        options.verbose ?? false,
        config.tunnelUrl
      );
    } catch (err) {
      s.stop("");
      log.error(`Failed to start tunnel: ${formatError(err)}`);
    }
  });

const connectTunnels = (
  token: string,
  tunnels: TunnelInfo[],
  verbose: boolean,
  tunnelBaseUrl: string
): Promise<void> => {
  return new Promise((_, reject) => {
    let isShuttingDown = false;
    let configWatcher: FSWatcher | null = null;

    // Map port to tunnelId for secret rotation
    const portToTunnelId = new Map(tunnels.map((t) => [t.port, t.tunnelId]));

    const manager = new TunnelManager(token, {
      verbose,
      onTakeover: () => {
        if (manager.activeTunnels === 0) {
          console.log();
          console.log(pc.dim("│  all tunnels taken over, exiting..."));
          process.exit(0);
        }
      },
      onMaxRetries: (port) => {
        reject(new Error(`${port} max reconnection attempts reached`));
      },
      onSecretRotated: (port, newSecret) => {
        const tunnelId = portToTunnelId.get(port);
        if (tunnelId) {
          const newUrl = `${tunnelBaseUrl}/${tunnelId}-${newSecret}`;
          console.log();
          console.log(pc.yellow(`  Secret rotated for port ${port}`));
          console.log(pc.cyan(`  New URL: ${newUrl}`));
          console.log();
        }
      },
    });

    const shutdown = (reason?: string) => {
      if (isShuttingDown) {
        return;
      }
      isShuttingDown = true;
      configWatcher?.close();
      console.log();
      console.log(pc.dim(`│  ${reason ?? "closing"}...`));
      manager.terminate();
      process.exit(0);
    };

    // Watch config file for logout
    const configPath = getConfigPath();
    configWatcher = watch(configPath, () => {
      const newConfig = loadConfig();
      if (!newConfig?.token) {
        shutdown("logged out, closing tunnels");
      }
    });

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on("data", (data) => {
        if (data[0] === 0x03) {
          shutdown();
        }
      });
    }

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
    process.on("exit", () => configWatcher?.close());

    for (const tunnel of tunnels) {
      manager.addTunnel(tunnel.port, tunnel.wsUrl);
    }

    manager.connect();
  });
};
