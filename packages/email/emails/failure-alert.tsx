import { Button, Heading, Link, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout.js";

type FailureAlertEmailProps = {
  endpointUrl?: string;
  failureCount?: number;
  dashboardUrl?: string;
};

export const FailureAlertEmail = ({
  endpointUrl = "https://api.example.com/webhooks",
  failureCount = 5,
  dashboardUrl = "https://app.usevon.com",
}: FailureAlertEmailProps) => (
  <EmailLayout
    preview={`Endpoint paused after ${failureCount} consecutive failures`}
  >
    <Section className="px-10 py-10">
      <Heading className="m-0 mb-4 font-semibold text-2xl text-foreground leading-8">
        Endpoint paused
      </Heading>

      <Text className="m-0 mb-6 text-[15px] text-muted leading-7">
        <strong className="text-foreground">{endpointUrl}</strong> failed{" "}
        {failureCount} times in a row. Von paused the endpoint and will skip new
        deliveries until the{" "}
        <Link
          className="text-foreground underline"
          href="https://docs.usevon.com/retries-recovery#circuit-breaker"
        >
          circuit breaker
        </Link>{" "}
        recovers.
      </Text>

      <Button
        className="inline-block border border-primary bg-primary px-6 py-3 text-center font-medium text-[14px] text-primary-foreground no-underline"
        href={dashboardUrl}
      >
        View Endpoint
      </Button>
    </Section>
  </EmailLayout>
);

export default FailureAlertEmail;
