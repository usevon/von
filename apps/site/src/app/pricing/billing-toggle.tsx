"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@usevon/ui";
import { Check } from "@phosphor-icons/react";

const plans = {
  monthly: [
    {
      name: "Hobby",
      price: "$0",
      period: "/month",
      description: "For side projects and experimentation.",
      features: [
        "25,000 webhooks/month",
        "25/sec throughput",
        "3 concurrent dev tunnels",
        "30 day retention",
        "3 team members",
        "Community support",
      ],
      cta: "Get started",
      href: "/signup",
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
        "5 concurrent dev tunnels",
        "90 day retention",
        "Unlimited team members",
        "Email support",
        "Custom domains",
      ],
      cta: "Start free trial",
      href: "/signup?plan=pro",
      highlighted: true,
    },
  ],
  yearly: [
    {
      name: "Hobby",
      price: "$0",
      period: "/month",
      description: "For side projects and experimentation.",
      features: [
        "25,000 webhooks/month",
        "25/sec throughput",
        "3 concurrent dev tunnels",
        "30 day retention",
        "3 team members",
        "Community support",
      ],
      cta: "Get started",
      href: "/signup",
      highlighted: false,
    },
    {
      name: "Pro",
      price: "$16",
      period: "/month + usage, billed yearly",
      description: "For production applications with growing traffic.",
      features: [
        "100,000 webhooks included",
        "100/sec throughput",
        "5 concurrent dev tunnels",
        "90 day retention",
        "Unlimited team members",
        "Email support",
        "Custom domains",
      ],
      cta: "Start free trial",
      href: "/signup?plan=pro&billing=yearly",
      highlighted: true,
    },
  ],
};

export const BillingToggle = () => {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const currentPlans = plans[billing];

  return (
    <>
      {/* Billing Toggle */}
      <div className="flex items-center rounded-lg border border-border bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => setBilling("monthly")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            billing === "monthly"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          onClick={() => setBilling("yearly")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            billing === "yearly"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Yearly
          <span className="ml-1.5 text-xs text-green-600 dark:text-green-400">Save 20%</span>
        </button>
      </div>

      {/* Plan Cards */}
      <div className="mx-auto mt-10 grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
        {currentPlans.map((plan) => (
          <div
            key={plan.name}
            className={`flex flex-col justify-between gap-6 rounded-xl p-6 ${
              plan.highlighted ? "bg-foreground text-background" : "bg-muted/50 dark:bg-white/5"
            }`}
          >
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl tracking-tight">{plan.name}</h3>
                {plan.highlighted && (
                  <span className="rounded-md bg-background/15 px-2 py-0.5 text-xs font-medium text-background">
                    Popular
                  </span>
                )}
              </div>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-medium">{plan.price}</span>
                {plan.period && (
                  <span className={plan.highlighted ? "text-background/60" : "text-muted-foreground"}>
                    {plan.period}
                  </span>
                )}
              </p>
              <p
                className={`mt-4 text-sm/6 ${
                  plan.highlighted ? "text-background/70" : "text-muted-foreground"
                }`}
              >
                {plan.description}
              </p>
              <ul className="mt-4 space-y-2 text-sm/6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <Check
                      weight="bold"
                      className={`size-5 shrink-0 ${plan.highlighted ? "text-background" : "text-foreground"}`}
                    />
                    <span className={plan.highlighted ? "text-background/80" : "text-muted-foreground"}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <Button
              variant={plan.highlighted ? "secondary" : "outline"}
              size="lg"
              nativeButton={false}
              render={<Link href={plan.href} />}
              className="w-full"
            >
              {plan.cta}
            </Button>
          </div>
        ))}
      </div>
    </>
  );
};
