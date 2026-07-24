import { log, note, spinner } from "@clack/prompts";
import { Command } from "commander";
import pc from "picocolors";
import { rotateTunnel } from "@/lib/api";
import { requireAuth } from "@/lib/config";
import { formatError, validatePort } from "@/lib/helpers";

export const rotate = new Command("rotate")
  .description("Rotate tunnel authentication secret")
  .option("-p, --port <port>", "Port of the tunnel to rotate")
  .action(async (options) => {
    const { token } = requireAuth();

    if (!options.port) {
      log.error("Port is required. Usage: von rotate -p <port>");
      return;
    }

    const port = validatePort(options.port);
    if (!port) {
      return;
    }

    const s = spinner();
    s.start("Rotating tunnel secret...");

    try {
      await rotateTunnel(token, port);

      s.stop("Secret rotated");

      note(
        `${pc.dim("Port:")} ${pc.magenta(port.toString())}`,
        "Secret Rotated"
      );
      log.success("Tunnel authentication secret has been rotated");
    } catch (err) {
      s.stop("");
      log.error(`Failed to rotate tunnel: ${formatError(err)}`);
    }
  });
