import {
  EmailButton,
  EmailText,
  EmailTimestamp,
  EmailTitle,
} from "./components/base.js";
import { Email } from "./components/layout.js";

type PlanChangedEmailProps = {
  name?: string;
  organizationName?: string;
  planName?: string;
  upgraded?: boolean;
  changedAt?: string;
  dashboardUrl?: string;
};

export const PlanChangedEmail = ({
  name = "Kyle",
  organizationName = "Acme Inc",
  planName = "Metered",
  upgraded = true,
  changedAt = "March 4, 2026 at 3:42 PM EST",
  dashboardUrl = "https://app.usevon.com",
}: PlanChangedEmailProps) => (
  <Email
    preview={`${organizationName} has been ${upgraded ? "upgraded" : "downgraded"} to the ${planName} plan`}
  >
    <EmailTitle>Plan {upgraded ? "upgraded" : "downgraded"}</EmailTitle>

    <EmailText>
      Hey {name}, the{" "}
      <strong className="text-foreground">{organizationName}</strong> team has
      been {upgraded ? "upgraded" : "downgraded"} to the {planName} plan and the
      changes are{" "}
      {upgraded
        ? "effective immediately."
        : "effective at the end of your current billing cycle."}
    </EmailText>

    <EmailTimestamp>Changed on {changedAt}</EmailTimestamp>

    <EmailButton href={dashboardUrl}>View Team Billing</EmailButton>
  </Email>
);

export default PlanChangedEmail;
