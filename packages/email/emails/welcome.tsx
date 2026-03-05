import { Button, Heading, Link, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout.js";

type WelcomeEmailProps = {
  name?: string;
  dashboardUrl?: string;
};

export const WelcomeEmail = ({
  name = "there",
  dashboardUrl = "https://app.usevon.com",
}: WelcomeEmailProps) => (
  <EmailLayout preview="Welcome to Von">
    <Section className="px-10 py-10">
      <Heading className="m-0 mb-4 font-semibold text-2xl text-foreground leading-8">
        Welcome to Von
      </Heading>

      <Text className="m-0 mb-6 text-[15px] text-muted leading-7">
        Hey {name}, your account is ready. Create an application, register an
        endpoint, and{" "}
        <Link
          className="text-foreground underline"
          href="https://docs.usevon.com/getting-started"
        >
          send your first webhook
        </Link>
        .
      </Text>

      <Button
        className="inline-block border border-primary bg-primary px-6 py-3 text-center font-medium text-[14px] text-primary-foreground no-underline"
        href={dashboardUrl}
      >
        Go to Dashboard
      </Button>
    </Section>
  </EmailLayout>
);

export default WelcomeEmail;
