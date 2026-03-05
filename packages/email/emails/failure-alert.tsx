import {
  EmailButton,
  EmailText,
  EmailTimestamp,
  EmailTitle,
} from "./components/base.js";
import { Email } from "./components/layout.js";

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
  <Email preview={`Endpoint paused after ${failureCount} consecutive failures`}>
    <EmailTitle>Endpoint paused</EmailTitle>

    <EmailText>
      Von has paused <strong className="text-foreground">{endpointUrl}</strong>{" "}
      after {failureCount} consecutive failures, but deliveries will resume as
      soon as the endpoint recovers.
    </EmailText>

    <EmailTimestamp>Paused on {pausedAt}</EmailTimestamp>

    <EmailButton href={dashboardUrl}>View Endpoint</EmailButton>
  </Email>
);

export default FailureAlertEmail;
