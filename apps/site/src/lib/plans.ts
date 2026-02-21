import type { Plan } from "@/components/plan-card";
import { urls } from "@/lib/urls";

export const plans: Plan[] = [
  {
    name: "Hobby",
    price: "$0",
    period: "/month",
    description: "Everything you need to start shipping webhooks.",
    features: [
      { label: "25,000 webhooks/month" },
      { label: "25/sec throughput" },
      { label: "3 day retention" },
      { label: "1 team member, up to 3 tunnels" },
      { label: "Custom domains", excluded: true },
      { label: "Discord support" },
    ],
    cta: "Get started",
    href: urls.signup,
    highlighted: false,
  },
  {
    name: "Metered",
    price: "$5",
    period: "/month + usage",
    description: "Only pay for what you process.",
    features: [
      { label: "Unlimited webhooks" },
      { label: "25/sec throughput" },
      { label: "7 days retention" },
      { label: "1 team member, up to 3 tunnels" },
      { label: "Custom domains" },
      { label: "Discord support" },
    ],
    cta: "Get started",
    href: urls.signup,
    highlighted: true,
  },
];
