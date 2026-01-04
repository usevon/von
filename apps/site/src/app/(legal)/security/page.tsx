import { LegalDocument } from "@/components/legal-document";

export default function SecurityPage() {
  return (
    <LegalDocument title="Security" lastUpdated="January 2, 2026">
      <p>
        At USEVON LLC ("<strong>Von</strong>"), security is foundational to our webhook
        infrastructure. This page outlines our security practices and how to report vulnerabilities.
      </p>

      <h2>Infrastructure Security</h2>
      <ul>
        <li>All data is encrypted in transit using TLS</li>
        <li>Infrastructure hosted on trusted cloud providers (Hetzner, Vercel)</li>
        <li>Isolated environments for development, staging, and production</li>
      </ul>

      <h2>Application Security</h2>
      <ul>
        <li>HMAC-SHA256 signatures on all webhook payloads</li>
        <li>API keys are SHA-256 hashed and never stored in plaintext</li>
        <li>Environment-prefixed API keys (dev, staging, prod)</li>
        <li>Rate limiting and abuse prevention</li>
        <li>Timing-safe signature verification</li>
      </ul>

      <h2>Access Controls</h2>
      <ul>
        <li>Organization-based access control for team accounts</li>
        <li>Session management with secure cookie handling</li>
        <li>Bearer token authentication for API access</li>
      </ul>

      <h2>Data Handling</h2>
      <p>
        Webhook payloads are processed transiently and stored according to your plan's retention
        period. We do not access payload contents except when debugging issues with your explicit
        permission. You can delete your data at any time through the dashboard.
      </p>

      <h2>Incident Response</h2>
      <p>
        In the event of a security incident affecting your data, we will notify affected users
        within 72 hours via email and provide details on the nature of the incident and remediation
        steps.
      </p>

      <h2>Reporting Vulnerabilities</h2>
      <p>
        We appreciate responsible disclosure of security vulnerabilities. If you discover a security
        issue, please report it to us privately:
      </p>
      <p>
        <strong>Email:</strong> <a href="mailto:security@usevon.com">security@usevon.com</a>
      </p>
      <p>Please include:</p>
      <ul>
        <li>Description of the vulnerability</li>
        <li>Steps to reproduce</li>
        <li>Potential impact</li>
        <li>Any suggested fixes (optional)</li>
      </ul>
      <p>
        We will acknowledge receipt within 48 hours and aim to resolve confirmed vulnerabilities
        promptly. We do not pursue legal action against researchers who follow responsible
        disclosure practices.
      </p>

      <h2>Contact</h2>
      <p>For security-related inquiries:</p>
      <p>
        <strong>USEVON LLC</strong>
        <br />
        Email: <a href="mailto:security@usevon.com">security@usevon.com</a>
        <br />
        Address: 123 Autumn Street, Wilmington, DE 19801
      </p>
    </LegalDocument>
  );
}
