import {
  EmailButton,
  EmailText,
  EmailTimestamp,
  EmailTitle,
} from "./components/base.js";
import { Email } from "./components/layout.js";

type EndpointDisabledEmailProps = {
  endpointUrl?: string;
  disabledAt?: string;
  failureDays?: number;
  dashboardUrl?: string;
};

export const EndpointDisabledEmail = ({
  endpointUrl = "https://api.example.com/webhooks",
  disabledAt = "March 4, 2026 at 3:42 PM EST",
  failureDays = 5,
  dashboardUrl = "https://app.usevon.com",
}: EndpointDisabledEmailProps) => (
  <Email preview={`Endpoint disabled after ${failureDays} days of failures`}>
    <EmailTitle>Endpoint disabled</EmailTitle>

    <EmailText>
      Von has disabled{" "}
      <strong className="text-foreground">{endpointUrl}</strong> after{" "}
      {failureDays} days without a successful delivery. Re-enable it from the
      dashboard when the endpoint is ready to receive traffic again.
    </EmailText>

    <EmailTimestamp>Disabled on {disabledAt}</EmailTimestamp>

    <EmailButton href={dashboardUrl}>Re-enable Endpoint</EmailButton>
  </Email>
);

export default EndpointDisabledEmail;
