import { cancel, isCancel, log, select } from "@clack/prompts";
import pc from "picocolors";
import { type Organization, setActiveOrganization } from "@/lib/api";
import { saveConfig } from "@/lib/config";

type SelectOrgOptions = {
  orgs: Organization[];
  token: string;
  currentOrgId?: string;
  exitOnCancel?: boolean;
};

export const selectAndSetOrganization = async (
  options: SelectOrgOptions
): Promise<boolean> => {
  const choice = await select({
    message: "Select an organization:",
    options: options.orgs.map((org) => ({
      value: org.id,
      label: org.name,
      hint: org.id === options.currentOrgId ? "current" : org.slug,
    })),
  });

  if (isCancel(choice)) {
    if (options.exitOnCancel) {
      cancel("Cancelled");
      process.exit(0);
    }
    return false;
  }

  if (choice === options.currentOrgId) {
    const name = options.orgs.find((o) => o.id === choice)?.name;
    log.info(`Already using ${pc.cyan(name)}`);
    return true;
  }

  await setActiveOrganization(options.token, choice as string);
  saveConfig({ organizationId: choice as string });
  const selected = options.orgs.find((o) => o.id === choice);
  log.success(`Organization set to ${pc.cyan(selected?.name)}`);
  return true;
};
