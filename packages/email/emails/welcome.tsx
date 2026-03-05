import {
  EmailBody,
  EmailButton,
  EmailText,
  EmailTitle,
} from "./components/base.js";
import { EmailLayout } from "./components/layout.js";

type WelcomeEmailProps = {
  name?: string;
  dashboardUrl?: string;
};

export const WelcomeEmail = ({
  name = "Kyle",
  dashboardUrl = "https://app.usevon.com",
}: WelcomeEmailProps) => (
  <EmailLayout preview="Welcome to Von">
    <EmailBody>
      <EmailTitle>Welcome to Von</EmailTitle>

      <EmailText>
        Hey {name}, go through the onboarding to create your team and start
        sending webhooks in under 5 minutes.
      </EmailText>

      <EmailButton href={dashboardUrl}>Go to Dashboard</EmailButton>
    </EmailBody>
  </EmailLayout>
);

export default WelcomeEmail;
