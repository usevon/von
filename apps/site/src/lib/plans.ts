import type { Plan } from "@/components/plan-card";
import { urls } from "@/lib/urls";

export const plans: Plan[] = [
  {
    name: "Hobby",
    price: "$0",
    period: "/month",
    description: "Everything you need to start shipping webhooks.",
    features: [
      {
        label: "25,000 webhooks/month",
        hint: "free forever",
        tooltip:
          "Includes both inbound and outbound webhooks, retries are free.",
      },
      {
        label: "25/sec throughput",
        tooltip:
          "The sustained number of webhooks Von can deliver per second on your plan.",
      },
      {
        label: "3 day retention",
        tooltip: "How long delivery logs and history are stored.",
      },
      {
        label: "1 team member",
        tooltip: "Additional members available on Pro.",
      },
      {
        label: "Custom domains",
        excluded: true,
        tooltip:
          "Deliver webhooks from your own domain instead of api.usevon.com.",
      },
      { label: "Discord support" },
    ],
    cta: "Get Started",
    href: urls.signup,
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$20",
    period: "/month + usage",
    description: "For teams that need scale, reliability, and control.",
    features: [
      {
        label: "100,000 webhooks/month",
        hint: "then $1 per 10k",
        tooltip:
          "Includes both inbound and outbound webhooks, retries are free.",
      },
      {
        label: "100/sec throughput",
        hint: "with burst",
        tooltip:
          "Sustained 100 webhooks/sec with burst up to 150/sec during traffic spikes.",
      },
      {
        label: "90 day retention",
        tooltip:
          "How long delivery logs and history are stored, extendable up to 1 year.",
      },
      {
        label: "5 team members",
        tooltip: "Additional members can be purchased from the dashboard.",
      },
      {
        label: "Custom domains",
        tooltip:
          "Deliver webhooks from your own domain instead of api.usevon.com.",
      },
      { label: "Discord + Email support" },
    ],
    cta: "Get Started",
    href: urls.signupPro,
    highlighted: true,
  },
];
