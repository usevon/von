import { ContactForm } from "./form";

export default function ContactPage() {
  return (
    <main>
      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
            Get in touch
          </h1>
          <div className="mt-12 grid grid-cols-1 gap-16 lg:grid-cols-2">
            <ContactForm />

            <div>
              <h2 className="font-semibold text-xl tracking-tight">
                Need help?
              </h2>
              <p className="mt-4 text-muted-foreground">
                For general support and questions, reach out to us:
              </p>
              <a
                className="mt-1 block text-foreground underline underline-offset-4"
                href="mailto:support@usevon.com"
              >
                support@usevon.com
              </a>

              <h2 className="mt-12 font-semibold text-xl tracking-tight">
                Security
              </h2>
              <p className="mt-4 text-muted-foreground">
                For security-related concerns or to report vulnerabilities:
              </p>
              <a
                className="mt-1 block text-foreground underline underline-offset-4"
                href="mailto:security@usevon.com"
              >
                security@usevon.com
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
