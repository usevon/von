import Link from "next/link";
import { Button } from "@usevon/ui";
import { CheckIcon } from "@phosphor-icons/react/ssr";
import { urls } from "@/lib/urls";

const plans = [
  {
    name: "Hobby",
    price: "$0",
    period: "/month",
    description: "For side projects and experimentation.",
    features: [
      "25,000 webhooks/month",
      "25/sec throughput",
      "3 concurrent dev tunnels",
      "7 day retention",
      "Custom domains",
      "Community support",
    ],
    cta: "Get started",
    href: urls.signup,
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$20",
    period: "/month + usage",
    description: "For production applications with growing traffic.",
    features: [
      "$20 usage credit included",
      "100,000 webhooks included",
      "100/sec throughput",
      "5 concurrent dev tunnels",
      "90 day retention",
      "Unlimited team members",
      "Email support",
    ],
    cta: "Get started",
    href: urls.signupPro,
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations with advanced requirements.",
    features: [
      "Unlimited webhooks",
      "Custom throughput",
      "Unlimited dev tunnels",
      "Custom retention",
      "Dedicated IP addresses",
      "SSO & SAML",
      "SLA & priority support",
    ],
    cta: "Contact us",
    href: "/contact",
    highlighted: false,
  },
];

export const PricingPlans = () => {
  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-2 md:grid-cols-3">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className="flex flex-col justify-between gap-6 rounded-xl bg-foreground/[0.025] p-6 dark:bg-white/5"
        >
          <div>
            <div className="mb-6">
              <h3 className="text-xl font-medium">{plan.name}</h3>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-semibold">{plan.price}</span>
                {plan.period && (
                  <span className="text-muted-foreground">{plan.period}</span>
                )}
              </p>
              <p className="mt-2 min-h-10 text-sm text-muted-foreground">
                {plan.description}
              </p>
            </div>
            <ul className="space-y-2 text-sm/6">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <CheckIcon weight="bold" className="mt-0.5 size-4 shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          {plan.highlighted ? (
            <Button size="lg" render={<Link href={plan.href} />} className="w-full">
              {plan.cta}
            </Button>
          ) : (
            <Button size="lg" variant="outline" render={<Link href={plan.href} />} className="w-full">
              {plan.cta}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};
