import { log, note, spinner } from "@clack/prompts";
import { Command } from "commander";
import pc from "picocolors";
import { getSession, rotateTunnel } from "@/lib/api";
import { requireAuth } from "@/lib/config";
import { formatError, generateTunnelId, validatePort } from "@/lib/helpers";

export const rotate = new Command("rotate")
  .description("Rotate tunnel secret to invalidate the current URL")
  .option("-p, --port <port>", "Port of the tunnel to rotate")
  .action(async (options) => {
    const { token, config } = requireAuth();

    if (!options.port) {
      log.error("Port is required. Usage: von rotate -p <port>");
      return;
    }

    const port = validatePort(options.port);
    if (!port) {
      return;
    }

    const organizationId = config.organizationId;
    if (!organizationId) {
      log.error("No organization selected. Run 'von login' or 'von switch'");
      return;
    }

    const s = spinner();
    s.start("Rotating tunnel secret...");

    try {
      const session = await getSession(token);
      if (!session) {
        s.stop("");
        log.error("Session expired, run 'von login' to re-authenticate");
        return;
      }

      const tunnelId = generateTunnelId(organizationId, session.user.id, port);
      const { secret } = await rotateTunnel(token, tunnelId);

      s.stop("Secret rotated");

      const tunnelUrl = `${config.apiUrl}/t/${tunnelId}-${secret}`;
      note(
        `${pc.dim("Port:")}   ${pc.magenta(port.toString())}\n${pc.dim("URL:")}    ${pc.cyan(tunnelUrl)}`,
        "New Tunnel URL"
      );
      log.success("Old URLs will no longer work");
    } catch (err) {
      s.stop("");
      log.error(`Failed to rotate tunnel: ${formatError(err)}`);
    }
  });
