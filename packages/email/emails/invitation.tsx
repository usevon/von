import { Button, Heading, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/layout.js";

type InvitationEmailProps = {
  inviterName?: string;
  organizationName?: string;
  role?: string;
  inviteLink?: string;
};

export const InvitationEmail = ({
  inviterName = "Kyle",
  organizationName = "Acme Inc",
  role = "member",
  inviteLink = "https://app.usevon.com/organization/accept-invitation/xxx",
}: InvitationEmailProps) => (
  <EmailLayout
    preview={`${inviterName} invited you to join ${organizationName} on Von`}
  >
    <Section className="px-10 py-10">
      <Heading className="m-0 mb-4 font-semibold text-2xl text-foreground leading-8">
        Join {organizationName}
      </Heading>

      <Text className="m-0 mb-6 text-[15px] text-muted leading-7">
        {inviterName} invited you to join{" "}
        <strong className="text-foreground">{organizationName}</strong> as a{" "}
        {role}. This invitation expires in 48 hours.
      </Text>

      <Button
        className="inline-block border border-primary bg-primary px-6 py-3 text-center font-medium text-[14px] text-primary-foreground no-underline"
        href={inviteLink}
      >
        Accept Invitation
      </Button>
    </Section>
  </EmailLayout>
);

export default InvitationEmail;
