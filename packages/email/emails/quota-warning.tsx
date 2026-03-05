import {
  EmailBody,
  EmailButton,
  EmailText,
  EmailTimestamp,
  EmailTitle,
} from "./components/base.js";
import { EmailLayout } from "./components/layout.js";

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
    <EmailLayout
      preview={
        exceeded
          ? `${organizationName} has reached its delivery limit`
          : `${organizationName} is approaching its delivery limit`
      }
    >
      <EmailBody>
        <EmailTitle>
          {exceeded
            ? `${organizationName} has reached its delivery limit`
            : `${organizationName} is approaching its delivery limit`}
        </EmailTitle>

        <EmailText>
          {exceeded ? (
            <>
              Hey {name}, the{" "}
              <strong className="text-foreground">{organizationName}</strong>{" "}
              team has reached its {fmt(limit)} monthly delivery limit on the
              Hobby plan, and deliveries will be paused until the next billing
              cycle.
            </>
          ) : (
            <>
              Hey {name}, the{" "}
              <strong className="text-foreground">{organizationName}</strong>{" "}
              team is nearing its {fmt(limit)} monthly delivery limit on the
              Hobby plan, and once it's reached deliveries will pause until the
              next billing cycle.
            </>
          )}
        </EmailText>

        <EmailText>We suggest you consider upgrading to Metered.</EmailText>

        <EmailButton href={dashboardUrl}>View Usage</EmailButton>

        <EmailTimestamp>{alertedAt}</EmailTimestamp>
      </EmailBody>
    </EmailLayout>
  );
};

export default QuotaWarningEmail;
