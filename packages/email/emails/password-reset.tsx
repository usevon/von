import {
  EmailBody,
  EmailButton,
  EmailText,
  EmailTimestamp,
  EmailTitle,
} from "./components/base.js";
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
    <EmailBody>
      <EmailTitle>Reset your password</EmailTitle>

      <EmailText>
        Someone requested a password reset for{" "}
        <strong className="text-foreground">{email}</strong> on Von, and you can
        use the link below to set a new one before it expires in 1 hour.
      </EmailText>

      <EmailText>
        If you did not request this, you can safely ignore this email.
      </EmailText>

      <EmailTimestamp>Requested on {requestTime}</EmailTimestamp>

      <EmailButton href={resetLink}>Reset Password</EmailButton>
    </EmailBody>
  </EmailLayout>
);

export default PasswordResetEmail;
