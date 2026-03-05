import {
  EmailButton,
  EmailText,
  EmailTimestamp,
  EmailTitle,
} from "./components/base.js";
import { Email } from "./components/layout.js";

type EndpointRecoveredEmailProps = {
  endpointUrl?: string;
  recoveredAt?: string;
  dashboardUrl?: string;
};

export const EndpointRecoveredEmail = ({
  endpointUrl = "https://api.example.com/webhooks",
  recoveredAt = "March 4, 2026 at 3:42 PM EST",
  dashboardUrl = "https://app.usevon.com",
}: EndpointRecoveredEmailProps) => (
  <Email preview={`Deliveries resumed to ${endpointUrl}`}>
    <EmailTitle>Endpoint recovered</EmailTitle>

    <EmailText>
      Von has resumed deliveries to{" "}
      <strong className="text-foreground">{endpointUrl}</strong> after the
      endpoint started responding again.
    </EmailText>

    <EmailTimestamp>Recovered on {recoveredAt}</EmailTimestamp>

    <EmailButton href={dashboardUrl}>View Endpoint</EmailButton>
  </Email>
);

export default EndpointRecoveredEmail;
