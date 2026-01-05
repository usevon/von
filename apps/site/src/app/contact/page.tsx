import { ContactForm } from "./form";

export default function ContactPage() {
  return (
    <main>
      <section className="py-16 lg:py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 px-6 lg:grid-cols-2 lg:gap-16 lg:px-10">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Get in touch
            </h1>
            <ContactForm />
          </div>

          <div className="mt-16 lg:mt-0">
            <h2 className="text-xl font-semibold tracking-tight">Need help?</h2>
            <p className="mt-4 text-muted-foreground">
              For general support and questions, reach out to us at{" "}
              <a href="mailto:support@usevon.com" className="text-foreground underline underline-offset-4">
                support@usevon.com
              </a>
            </p>

            <h2 className="mt-12 text-xl font-semibold tracking-tight">Security</h2>
            <p className="mt-4 text-muted-foreground">
              For security-related concerns or to report vulnerabilities, contact{" "}
              <a href="mailto:security@usevon.com" className="text-foreground underline underline-offset-4">
                security@usevon.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
