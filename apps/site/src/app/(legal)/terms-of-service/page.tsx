import { LegalDocument } from "@/components/legal-document";

export default function TermsOfServicePage() {
  return (
    <LegalDocument title="Terms of Service" lastUpdated="January 2, 2026">
      <p>
        These Terms of Service ("<strong>Terms</strong>") govern your access to and use of the
        services provided by USEVON LLC ("<strong>Von</strong>," "<strong>we</strong>," "
        <strong>us</strong>," or "<strong>our</strong>"), including our webhook infrastructure,
        APIs, dashboard, and related services (collectively, the "<strong>Services</strong>").
      </p>
      <p>
        By accessing or using the Services, you agree to be bound by these Terms. If you do not
        agree, do not use the Services.
      </p>

      <h2>Account Registration</h2>
      <p>
        To use certain features of the Services, you must create an account. You agree to provide
        accurate information and keep it updated. You are responsible for maintaining the
        confidentiality of your account credentials and API keys, and for all activities under your
        account.
      </p>

      <h2>Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Services for any unlawful purpose</li>
        <li>Transmit malicious code, spam, or harmful content through webhooks</li>
        <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
        <li>Interfere with or disrupt the Services</li>
        <li>Exceed rate limits or abuse the infrastructure</li>
        <li>Resell or redistribute the Services without authorization</li>
      </ul>

      <h2>Service Availability</h2>
      <p>
        We strive to maintain high availability but do not guarantee uninterrupted access to the
        Services. We may modify, suspend, or discontinue features with reasonable notice when
        possible. Scheduled maintenance will be communicated in advance.
      </p>

      <h2>Payment and Billing</h2>
      <p>
        Paid plans are billed in advance on a monthly or annual basis. All fees are non-refundable
        except as required by law. We may change pricing with 30 days notice. Failure to pay may
        result in suspension or termination of your account.
      </p>

      <h2>Data and Privacy</h2>
      <p>
        Your use of the Services is also governed by our{" "}
        <a href="/privacy-policy">Privacy Policy</a>. You retain ownership of your data. We process
        webhook payloads solely to provide the Services and do not access payload contents except
        for debugging with your permission.
      </p>

      <h2>Intellectual Property</h2>
      <p>
        The Services and all related technology, branding, and content are owned by USEVON LLC. Our
        open-source components are licensed under their respective licenses (MIT or AGPL-3.0 as
        specified in our repositories).
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, USEVON LLC shall not be liable for any indirect,
        incidental, special, consequential, or punitive damages, or any loss of profits or revenues.
        Our total liability shall not exceed the amount paid by you in the 12 months preceding the
        claim.
      </p>

      <h2>Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless USEVON LLC from any claims, damages, or expenses
        arising from your use of the Services or violation of these Terms.
      </p>

      <h2>Termination</h2>
      <p>
        You may terminate your account at any time through the dashboard. We may suspend or
        terminate your access for violation of these Terms or for any reason with reasonable notice.
        Upon termination, your right to use the Services ceases and your data may be deleted after a
        retention period.
      </p>

      <h2>Changes to Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be communicated via email
        or through the Services. Continued use after changes constitutes acceptance.
      </p>

      <h2>Governing Law</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, United States, without regard
        to conflict of law principles.
      </p>

      <h2>Contact Us</h2>
      <p>If you have questions about these Terms, contact us at:</p>
      <p>
        <strong>USEVON LLC</strong>
        <br />
        Email: <a href="mailto:legal@usevon.com">legal@usevon.com</a>
        <br />
        Address: 123 Autumn Street, Wilmington, DE 19801
      </p>
    </LegalDocument>
  );
}
