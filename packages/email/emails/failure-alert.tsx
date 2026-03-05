import {
  EmailBody,
  EmailButton,
  EmailText,
  EmailTimestamp,
  EmailTitle,
} from "./components/base.js";
import { EmailLayout } from "./components/layout.js";

type FailureAlertEmailProps = {
  endpointUrl?: string;
  failureCount?: number;
  pausedAt?: string;
  dashboardUrl?: string;
};

export const FailureAlertEmail = ({
  endpointUrl = "https://api.example.com/webhooks",
  failureCount = 5,
  pausedAt = "March 4, 2026 at 3:42 PM EST",
  dashboardUrl = "https://app.usevon.com",
}: FailureAlertEmailProps) => (
  <EmailLayout
    preview={`Endpoint paused after ${failureCount} consecutive failures`}
  >
    <EmailBody>
      <EmailTitle>Endpoint paused</EmailTitle>

      <EmailText>
        Von has paused{" "}
        <strong className="text-foreground">{endpointUrl}</strong> after{" "}
        {failureCount} consecutive delivery failures, and deliveries will resume
        automatically once the endpoint starts responding.
      </EmailText>

      <EmailTimestamp>Paused on {pausedAt}</EmailTimestamp>

      <EmailButton href={dashboardUrl}>View Endpoint</EmailButton>
    </EmailBody>
  </EmailLayout>
);

export default FailureAlertEmail;
