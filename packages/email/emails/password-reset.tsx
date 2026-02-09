import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

interface PasswordResetEmailProps {
  email?: string;
  resetLink?: string;
  requestTime?: string;
}

export const PasswordResetEmail = ({
  email = "user@example.com",
  resetLink = "https://app.usevon.com/reset-password?token=xxx",
  requestTime = "January 19, 2026 at 12:47 AM EST",
}: PasswordResetEmailProps) => (
  <Html>
    <Head />
    <Preview>Reset your Von password</Preview>
    <Tailwind
      config={{
        theme: {
          extend: {
            colors: {
              primary: "#7C3AED",
            },
          },
        },
      }}
    >
      <Body className="bg-[#f6f9fc] font-sans">
        <Container className="mx-auto mb-16 max-w-[600px] rounded-lg bg-white p-10 text-left">
          <Heading className="m-0 mb-6 font-semibold text-2xl text-[#1a1a1a] leading-8">
            Password Reset Request
          </Heading>

          <Text className="m-0 mb-4 text-[#374151] text-base leading-7">
            Hello,
          </Text>

          <Text className="m-0 mb-4 text-[#374151] text-base leading-7">
            We received a request to reset the password for your Von account
            associated with <strong>{email}</strong>.
          </Text>

          <Text className="m-0 mb-4 text-[#374151] text-base leading-7">
            Click the button below to reset your password. This link will expire
            in 1 hour for your security.
          </Text>

          <Section className="my-8">
            <Button
              className="inline-block rounded-lg bg-primary px-8 py-3 text-center font-semibold text-base text-white no-underline"
              href={resetLink}
            >
              Reset Password
            </Button>
          </Section>

          <Section className="my-6 rounded-lg bg-[#f9fafb] p-5">
            <Text className="m-0 mb-3 font-semibold text-[#1a1a1a] text-sm">
              Request Details:
            </Text>
            <Text className="m-0 mb-2 text-[#6b7280] text-sm leading-5">
              <strong>Time:</strong> {requestTime}
            </Text>
            <Text className="m-0 text-[#6b7280] text-sm leading-5">
              <strong>Email:</strong> {email}
            </Text>
          </Section>

          <Hr className="my-8 border-[#e5e7eb]" />

          <Section>
            <Text className="m-0 mb-3 text-[#9ca3af] text-[13px] leading-5">
              If you did not request this password reset, you can safely ignore
              this email. The link will expire automatically in 1 hour.
            </Text>
            <Text className="m-0 mb-3 text-[#9ca3af] text-[13px] leading-5">
              Need help? Contact us at{" "}
              <Link
                className="text-primary no-underline"
                href="mailto:support@usevon.com"
              >
                support@usevon.com
              </Link>
            </Text>
            <Text className="m-0 mt-6 text-[#9ca3af] text-xs">
              &copy; {new Date().getFullYear()} Von. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);

export default PasswordResetEmail;
