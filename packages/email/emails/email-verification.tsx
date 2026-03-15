import {
  EmailButton,
  EmailText,
  EmailTimestamp,
  EmailTitle,
} from "./components/base.js";
import { Email } from "./components/layout.js";

type VerificationEmailProps = {
  email?: string;
  verifyLink?: string;
  requestTime?: string;
};

export const VerificationEmail = ({
  email = "user@example.com",
  verifyLink = "https://app.usevon.com/verify-email?token=xxx",
  requestTime = "January 19, 2026 at 12:47 AM EST",
}: VerificationEmailProps) => (
  <Email preview="Verify your email address">
    <EmailTitle>Verify your email</EmailTitle>

    <EmailText>
      Confirm that <strong className="text-foreground">{email}</strong> belongs
      to you by clicking the link below before it expires in 1 hour.
    </EmailText>

    <EmailTimestamp>Requested on {requestTime}</EmailTimestamp>

    <EmailButton href={verifyLink}>Verify Email</EmailButton>
  </Email>
);

export default VerificationEmail;
