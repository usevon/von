import { CheckIcon } from "@phosphor-icons/react/ssr";
import { Button } from "@usevon/ui";
import Link from "next/link";
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
      "3 day retention",
      "Custom domains",
      "Discord support",
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
      "100,000 webhooks included",
      "100/sec throughput",
      "90 day retention",
      "5 team members",
      "Discord + Email support",
    ],
    cta: "Get started",
    href: urls.signupPro,
    highlighted: true,
  },
];

export const PricingPlans = () => (
  <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-2 md:grid-cols-2">
    {plans.map((plan) => (
      <div
        className="flex flex-col justify-between gap-6 rounded-xl bg-foreground/[0.025] p-6 dark:bg-white/5"
        key={plan.name}
      >
        <div>
          <div className="mb-6">
            <h3 className="font-medium text-xl">{plan.name}</h3>
            <p className="mt-4 flex items-baseline gap-1">
              <span className="font-semibold text-3xl">{plan.price}</span>
              {plan.period && (
                <span className="text-muted-foreground">{plan.period}</span>
              )}
            </p>
            <p className="mt-2 min-h-10 text-muted-foreground text-sm">
              {plan.description}
            </p>
          </div>
          <ul className="space-y-2 text-sm/6">
            {plan.features.map((feature) => (
              <li className="flex gap-3" key={feature}>
                <CheckIcon className="mt-0.5 size-4 shrink-0" weight="bold" />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        {plan.highlighted ? (
          <Button
            className="w-full"
            render={<Link href={plan.href} />}
            size="lg"
          >
            {plan.cta}
          </Button>
        ) : (
          <Button
            className="w-full"
            render={<Link href={plan.href} />}
            size="lg"
            variant="outline"
          >
            {plan.cta}
          </Button>
        )}
      </div>
    ))}
  </div>
);
