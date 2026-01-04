import Link from "next/link";

const subprocessors = [
  {
    name: "Vercel",
    purpose: "Frontend hosting and deployment",
    location: "United States",
    website: "https://vercel.com",
  },
  {
    name: "Hetzner",
    purpose: "Cloud infrastructure and hosting",
    location: "Germany",
    website: "https://hetzner.com",
  },
  {
    name: "Cloudflare",
    purpose: "CDN, DNS, and security services",
    location: "United States",
    website: "https://cloudflare.com",
  },
  {
    name: "Autumn",
    purpose: "Subscription and billing management (via Stripe)",
    location: "United States",
    website: "https://useautumn.com",
  },
  {
    name: "Stripe",
    purpose: "Payment processing",
    location: "United States",
    website: "https://stripe.com",
  },
  {
    name: "Resend",
    purpose: "Transactional email delivery",
    location: "United States",
    website: "https://resend.com",
  },
];

export default function SubprocessorsPage() {
  return (
    <main className="py-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 sm:gap-16 lg:px-10">
        <div className="flex max-w-2xl flex-col gap-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Subprocessors</h1>
          <p className="text-lg text-muted-foreground">
            Third-party services that process data on our behalf.
          </p>
          <p className="text-sm text-muted-foreground">Last updated on January 2, 2026.</p>
        </div>

        <table className="max-w-2xl text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium">Purpose</th>
              <th className="pb-3 font-medium max-sm:hidden">Location</th>
              <th className="pb-3 font-medium">Website</th>
            </tr>
          </thead>
          <tbody className="[&_tr]:border-b [&_tr]:border-border">
            {subprocessors.map((processor) => (
              <tr key={processor.name}>
                <td className="py-3 pr-4 font-medium">{processor.name}</td>
                <td className="py-3 pr-4 text-muted-foreground">{processor.purpose}</td>
                <td className="py-3 pr-4 text-muted-foreground max-sm:hidden">
                  {processor.location}
                </td>
                <td className="py-3">
                  <Link
                    href={processor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    {processor.website.replace("https://", "")}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="max-w-2xl space-y-4 text-sm text-muted-foreground">
          <p>
            We only share data with subprocessors when necessary to provide our services. Each
            subprocessor is contractually obligated to protect your data and use it only for the
            purposes specified.
          </p>
          <p>
            Questions? Contact{" "}
            <Link
              href="mailto:privacy@usevon.com"
              className="font-medium text-foreground underline underline-offset-4"
            >
              privacy@usevon.com
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
