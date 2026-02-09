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
}: PasswordResetEmailProps) => {
  return (
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
          <Container className="bg-white mx-auto p-10 mb-16 max-w-[600px] rounded-lg text-left">
            <Heading className="text-[#1a1a1a] text-2xl font-semibold leading-8 m-0 mb-6">
              Password Reset Request
            </Heading>

            <Text className="text-[#374151] text-base leading-7 m-0 mb-4">
              Hello,
            </Text>

            <Text className="text-[#374151] text-base leading-7 m-0 mb-4">
              We received a request to reset the password for your Von account
              associated with <strong>{email}</strong>.
            </Text>

            <Text className="text-[#374151] text-base leading-7 m-0 mb-4">
              Click the button below to reset your password. This link will
              expire in 1 hour for your security.
            </Text>

            <Section className="my-8">
              <Button
                href={resetLink}
                className="bg-primary rounded-lg text-white text-base font-semibold no-underline text-center inline-block px-8 py-3"
              >
                Reset Password
              </Button>
            </Section>

            <Section className="bg-[#f9fafb] rounded-lg p-5 my-6">
              <Text className="text-[#1a1a1a] text-sm font-semibold m-0 mb-3">
                Request Details:
              </Text>
              <Text className="text-[#6b7280] text-sm leading-5 m-0 mb-2">
                <strong>Time:</strong> {requestTime}
              </Text>
              <Text className="text-[#6b7280] text-sm leading-5 m-0">
                <strong>Email:</strong> {email}
              </Text>
            </Section>

            <Hr className="border-[#e5e7eb] my-8" />

            <Section>
              <Text className="text-[#9ca3af] text-[13px] leading-5 m-0 mb-3">
                If you did not request this password reset, you can safely ignore
                this email. The link will expire automatically in 1 hour.
              </Text>
              <Text className="text-[#9ca3af] text-[13px] leading-5 m-0 mb-3">
                Need help? Contact us at{" "}
                <Link
                  href="mailto:support@usevon.com"
                  className="text-primary no-underline"
                >
                  support@usevon.com
                </Link>
              </Text>
              <Text className="text-[#9ca3af] text-xs m-0 mt-6">
                &copy; {new Date().getFullYear()} Von. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PasswordResetEmail;
