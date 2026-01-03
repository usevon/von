import { LegalDocument } from "@/components/legal-document";

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument title="Privacy Policy" lastUpdated="January 2, 2026">
      <p>
        USEVON LLC ("<strong>Von</strong>," "<strong>we</strong>," "<strong>us</strong>," or "
        <strong>our</strong>") respects your privacy and is committed to protecting your personal
        information. This Privacy Policy describes how we collect, use, store, and protect
        information when you interact with our websites, products, or services (collectively, the
        "<strong>Services</strong>").
      </p>

      <h2>Information We Collect</h2>
      <p>
        We collect information that you voluntarily provide when you interact with the Services,
        such as when you create an account, contact us, or use our webhook infrastructure. This may
        include:
      </p>
      <ul>
        <li>Account information (name, email address)</li>
        <li>Payment information (processed securely through our payment provider)</li>
        <li>API keys and webhook configurations</li>
        <li>Usage data and logs related to webhook delivery</li>
      </ul>
      <p>
        We also automatically collect technical information when you use the Services, including
        browser type, device information, IP address, and general usage data.
      </p>

      <h2>How We Use Your Information</h2>
      <p>Information we collect is used for:</p>
      <ul>
        <li>Providing, maintaining, and improving the Services</li>
        <li>Processing webhook deliveries and maintaining delivery logs</li>
        <li>Responding to inquiries and providing support</li>
        <li>Sending service-related communications</li>
        <li>Complying with legal obligations</li>
      </ul>

      <h2>Data Sharing and Retention</h2>
      <p>
        We do not sell your personal information. We may share information with third-party service
        providers who perform services on our behalf (such as hosting, payment processing, or
        analytics) only to the extent necessary for them to perform those services. See our{" "}
        <a href="/subprocessors">Subprocessors</a> page for a complete list.
      </p>
      <p>
        Webhook payload data is retained according to your plan's retention period. You can delete
        your data at any time through the dashboard or by contacting us.
      </p>

      <h2>Security</h2>
      <p>
        We implement industry-standard security measures to protect your information, including
        encryption in transit and at rest, regular security audits, and access controls. For more
        details, see our <a href="/security">Security Policy</a>.
      </p>

      <h2>Your Rights</h2>
      <p>
        Depending on your location, you may have rights regarding your personal information,
        including the right to access, correct, or delete your data. To exercise these rights,
        contact us at the email below.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Changes will be reflected by updating
        the "Last updated" date at the top of this page. Continued use of the Services after changes
        indicates acceptance of the updated policy.
      </p>

      <h2>Contact Us</h2>
      <p>If you have questions about this Privacy Policy, contact us at:</p>
      <p>
        <strong>USEVON LLC</strong>
        <br />
        Email: <a href="mailto:privacy@usevon.com">privacy@usevon.com</a>
        <br />
        Address: 123 Autumn Street, Wilmington, DE 19801
      </p>
    </LegalDocument>
  );
}
