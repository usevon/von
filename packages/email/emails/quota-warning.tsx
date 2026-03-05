import {
  EmailButton,
  EmailText,
  EmailTimestamp,
  EmailTitle,
} from "./components/base.js";
import { Email } from "./components/layout.js";

type QuotaWarningEmailProps = {
  name?: string;
  organizationName?: string;
  limit?: number;
  percentUsed?: number;
  alertedAt?: string;
  dashboardUrl?: string;
};

const fmt = (n: number) => n.toLocaleString("en-US");

export const QuotaWarningEmail = ({
  name = "Kyle",
  organizationName = "Acme Inc",
  limit = 25_000,
  percentUsed = 80,
  alertedAt = "March 4, 2026 at 3:42 PM EST",
  dashboardUrl = "https://app.usevon.com",
}: QuotaWarningEmailProps) => {
  const exceeded = percentUsed >= 100;

  return (
    <Email
      preview={
        exceeded
          ? `${organizationName} has reached its delivery limit`
          : `${organizationName} is approaching its delivery limit`
      }
    >
      <EmailTitle>
        {exceeded
          ? `${organizationName} has reached its delivery limit`
          : `${organizationName} is approaching its delivery limit`}
      </EmailTitle>

      <EmailText>
        {exceeded ? (
          <>
            Hey {name},{" "}
            <strong className="text-foreground">{organizationName}</strong> has
            reached its {fmt(limit)} monthly delivery limit on the Hobby plan,
            and deliveries will be paused until the next billing cycle.
          </>
        ) : (
          <>
            Hey {name},{" "}
            <strong className="text-foreground">{organizationName}</strong> is
            at {percentUsed}% of its {fmt(limit)} monthly delivery limit on the
            Hobby plan. Deliveries will pause automatically once the limit is
            reached.
          </>
        )}
      </EmailText>

      <EmailText>Upgrade to Metered to remove limits.</EmailText>

      <EmailTimestamp>Alerted on {alertedAt}</EmailTimestamp>

      <EmailButton href={dashboardUrl}>View Usage</EmailButton>
    </Email>
  );
};

export default QuotaWarningEmail;
