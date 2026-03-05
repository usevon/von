import { EmailText, EmailTimestamp, EmailTitle } from "./components/base.js";
import { Email } from "./components/layout.js";

type EmailChangedEmailProps = {
  name?: string;
  newEmail?: string;
  changedAt?: string;
};

export const EmailChangedEmail = ({
  name = "Kyle",
  newEmail = "kyle@new.com",
  changedAt = "March 4, 2026 at 3:42 PM EST",
}: EmailChangedEmailProps) => (
  <Email preview="Your Von account email has been changed">
    <EmailTitle>Email address changed</EmailTitle>

    <EmailText>
      Hey {name}, the email address on your Von account was changed to{" "}
      <strong className="text-foreground">{newEmail}</strong>. If you did not
      make this change, please contact support immediately.
    </EmailText>

    <EmailTimestamp>Changed on {changedAt}</EmailTimestamp>
  </Email>
);

export default EmailChangedEmail;
