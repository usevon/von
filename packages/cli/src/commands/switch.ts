import { log, outro, spinner } from "@clack/prompts";
import { Command } from "commander";
import pc from "picocolors";
import { listOrganizations } from "@/lib/api";
import { requireAuth } from "@/lib/config";
import { selectAndSetOrganization } from "@/lib/org";

export const switchOrg = new Command("switch")
  .description("Switch active organization")
  .action(async () => {
    const { token, config } = requireAuth();

    const s = spinner();
    s.start("Fetching organizations...");

    const orgs = await listOrganizations(token);

    if (orgs.length === 0) {
      s.stop();
      log.info("No organizations found");
      outro(`Create one at ${pc.cyan("app.usevon.com")}`);
      return;
    }

    if (orgs.length === 1) {
      const org = orgs[0]!;
      const isCurrentOrg = org.id === config.organizationId;
      s.stop(
        isCurrentOrg
          ? `Already using ${pc.cyan(org.name)}`
          : `Found ${pc.cyan(org.name)}`
      );
      if (isCurrentOrg) {
        outro("Create more orgs to switch between them");
      } else {
        await selectAndSetOrganization({
          orgs,
          token,
          currentOrgId: config.organizationId,
        });
      }
      return;
    }

    s.stop(`Found ${orgs.length} organizations`);

    const currentOrg = orgs.find((o) => o.id === config.organizationId);
    if (currentOrg) {
      log.info(`Current: ${pc.cyan(currentOrg.name)}`);
    }

    await selectAndSetOrganization({
      orgs,
      token,
      currentOrgId: config.organizationId,
      exitOnCancel: true,
    });
  });
