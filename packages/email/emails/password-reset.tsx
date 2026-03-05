import {
  EmailButton,
  EmailText,
  EmailTimestamp,
  EmailTitle,
} from "./components/base.js";
import { Email } from "./components/layout.js";

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
  <Email preview="Reset your Von password">
    <EmailTitle>Reset your password</EmailTitle>

    <EmailText>
      Someone requested a password reset for{" "}
      <strong className="text-foreground">{email}</strong> on Von. Use the link
      below to set a new password before it expires in 1 hour.
    </EmailText>

    <EmailText>If this wasn't you, you can safely ignore this email.</EmailText>

    <EmailTimestamp>Requested on {requestTime}</EmailTimestamp>

    <EmailButton href={resetLink}>Reset Password</EmailButton>
  </Email>
);

export default PasswordResetEmail;
