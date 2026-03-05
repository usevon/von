import {
  EmailButton,
  EmailText,
  EmailTimestamp,
  EmailTitle,
} from "./components/base.js";
import { Email } from "./components/layout.js";

type InvitationEmailProps = {
  inviterName?: string;
  organizationName?: string;
  role?: string;
  inviteLink?: string;
  invitedAt?: string;
};

export const InvitationEmail = ({
  inviterName = "Kyle",
  organizationName = "Acme Inc",
  role = "member",
  inviteLink = "https://app.usevon.com/organization/accept-invitation/xxx",
  invitedAt = "March 4, 2026 at 3:42 PM EST",
}: InvitationEmailProps) => (
  <Email
    preview={`${inviterName} invited you to join ${organizationName} on Von`}
  >
    <EmailTitle>Join {organizationName}</EmailTitle>

    <EmailText>
      {inviterName} has invited you to join the{" "}
      <strong className="text-foreground">{organizationName}</strong> team on
      Von as a {role}, and you have 48 hours to accept before the invitation
      expires.
    </EmailText>

    <EmailTimestamp>Invited on {invitedAt}</EmailTimestamp>

    <EmailButton href={inviteLink}>Accept Invitation</EmailButton>
  </Email>
);

export default InvitationEmail;
