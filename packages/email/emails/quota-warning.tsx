import { Button, Heading, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout.js";

type QuotaWarningEmailProps = {
  organizationName?: string;
  currentUsage?: number;
  limit?: number;
  percentUsed?: number;
  dashboardUrl?: string;
};

const fmt = (n: number) => n.toLocaleString("en-US");

export const QuotaWarningEmail = ({
  organizationName = "Acme Inc",
  currentUsage = 20_000,
  limit = 25_000,
  percentUsed = 80,
  dashboardUrl = "https://app.usevon.com",
}: QuotaWarningEmailProps) => {
  const exceeded = percentUsed >= 100;
  const barColor = exceeded ? "#ef4444" : "#f59e0b";

  return (
    <EmailLayout
      preview={
        exceeded
          ? `${organizationName} reached its delivery limit`
          : `${organizationName} used ${percentUsed}% of its delivery limit`
      }
    >
      <Section className="px-10 py-10">
        <Heading className="m-0 mb-4 font-semibold text-2xl text-foreground leading-8">
          {exceeded ? "Delivery limit reached" : "Approaching delivery limit"}
        </Heading>

        <Text className="m-0 mb-6 text-[15px] text-muted leading-7">
          {exceeded
            ? `${organizationName} has used all ${fmt(limit)} monthly deliveries. New deliveries will be rejected until the limit resets.`
            : `${organizationName} has used ${fmt(currentUsage)} of ${fmt(limit)} monthly deliveries (${percentUsed}%).`}
        </Text>

        {/* Progress bar */}
        <div
          style={{
            backgroundColor: "#e4e4e7",
            height: "6px",
            width: "100%",
            overflow: "hidden",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              backgroundColor: barColor,
              height: "6px",
              width: `${Math.min(percentUsed, 100)}%`,
            }}
          />
        </div>

        <Button
          className="inline-block border border-primary bg-primary px-6 py-3 text-center font-medium text-[14px] text-primary-foreground no-underline"
          href={dashboardUrl}
        >
          View Usage
        </Button>
      </Section>
    </EmailLayout>
  );
};

export default QuotaWarningEmail;
