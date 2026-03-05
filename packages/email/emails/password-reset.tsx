import { Button, Heading, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout.js";

type PasswordResetEmailProps = {
  email?: string;
  resetLink?: string;
  requestTime?: string;
};

export const PasswordResetEmail = ({
  email = "user@example.com",
  resetLink = "https://app.usevon.com/reset-password?token=xxx",
  requestTime = "January 19, 2026 at 12:47 AM EST",
}: PasswordResetEmailProps) => (
  <EmailLayout preview="Reset your Von password">
    <Section className="px-10 py-10">
      <Heading className="m-0 mb-4 font-semibold text-2xl text-foreground leading-8">
        Reset your password
      </Heading>

      <Text className="m-0 mb-6 text-[15px] text-muted leading-7">
        Von received a password reset request for{" "}
        <strong className="text-foreground">{email}</strong> on {requestTime}.
        This link expires in 1 hour.
      </Text>

      <Button
        className="inline-block border border-primary bg-primary px-6 py-3 text-center font-medium text-[14px] text-primary-foreground no-underline"
        href={resetLink}
      >
        Reset Password
      </Button>

      <Text className="m-0 mt-6 text-muted text-xs">
        If you didn't request this, ignore this email.
      </Text>
    </Section>
  </EmailLayout>
);

export default PasswordResetEmail;
