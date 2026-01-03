import { Avatar, AvatarImage, AvatarFallback } from "@usevon/ui";
import { ContactForm } from "./form";

export default function ContactPage() {
  return (
    <main className="relative isolate">
      <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-2">
        {/* Form */}
        <div className="px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-xl lg:mr-0 lg:max-w-lg">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Let's work together
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Have a question about Von or want to discuss Enterprise? We'd love to hear from you.
            </p>
            <ContactForm />
          </div>
        </div>

        {/* Right side */}
        <div className="relative bg-foreground/[0.02] px-6 py-24 sm:py-32 lg:px-8 dark:bg-white/[0.02]">
          <div className="relative mx-auto max-w-xl lg:ml-0 lg:max-w-lg">
            <h2 className="text-xl font-semibold tracking-tight">Get in touch</h2>
            <p className="mt-4 text-muted-foreground">
              We typically respond within 24 hours on business days.
            </p>

            <dl className="mt-10 space-y-6 text-sm">
              <div>
                <dt className="font-medium">General inquiries</dt>
                <dd className="mt-1">
                  <a
                    href="mailto:contact@usevon.com"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    contact@usevon.com
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-medium">Sales</dt>
                <dd className="mt-1">
                  <a
                    href="mailto:sales@usevon.com"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    sales@usevon.com
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-medium">Support</dt>
                <dd className="mt-1">
                  <a
                    href="mailto:support@usevon.com"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    support@usevon.com
                  </a>
                </dd>
              </div>
            </dl>

            <div className="mt-16 border-t border-border pt-10">
              <figure>
                <blockquote className="text-lg/8 text-muted-foreground">
                  "We switched from building our own retry logic to Von and immediately saw a 40% reduction in failed deliveries. The dashboard makes debugging so much easier."
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-4">
                  <Avatar className="size-10">
                    <AvatarImage src="/testimonials/nathan-james.jpg" alt="Nathan James" />
                    <AvatarFallback>NJ</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">Nathan James</div>
                    <div className="text-sm text-muted-foreground">Head of Engineering at Profitate</div>
                  </div>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
