"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  AtomIcon,
  CodeIcon,
  GlobeIcon,
  HouseIcon,
  KeyIcon,
  LockIcon,
  PaperPlaneTiltIcon,
  RocketLaunchIcon,
  TagIcon,
  TerminalIcon,
} from "@phosphor-icons/react";
import { Button } from "@usevon/ui";
import Link from "next/link";
import { cn } from "@/lib/utils";

type FeatureCardProps = {
  href: string;
  icon: Icon;
  title: string;
  description: string;
};

type FeatureSection = {
  title: string;
  cards: FeatureCardProps[];
};

const featureSections: FeatureSection[] = [
  {
    title: "Start Here",
    cards: [
      {
        href: "/getting-started",
        icon: RocketLaunchIcon,
        title: "Quick Start",
        description:
          "Install the SDK, configure your endpoint, and ship your first real webhook flow in minutes.",
      },
      {
        href: "/hosting",
        icon: HouseIcon,
        title: "Cloud or Self-Hosted",
        description:
          "Choose Von Cloud for fast setup, or self-host for full infrastructure and data control.",
      },
      {
        href: "/verification",
        icon: LockIcon,
        title: "Verifying Signatures",
        description:
          "Verify HMAC signatures on incoming webhooks to confirm authenticity and prevent replay attacks.",
      },
    ],
  },
  {
    title: "Sending Webhooks",
    cards: [
      {
        href: "/endpoints",
        icon: GlobeIcon,
        title: "Endpoints",
        description:
          "Create and configure webhook endpoints with URL targeting, event filtering, and test deliveries.",
      },
      {
        href: "/events-deliveries",
        icon: PaperPlaneTiltIcon,
        title: "Events & Deliveries",
        description:
          "Send events, track delivery status, use idempotency keys, and replay failed deliveries.",
      },
      {
        href: "/retries-recovery",
        icon: ArrowCounterClockwiseIcon,
        title: "Retries & Recovery",
        description:
          "Automatic retries with exponential backoff, circuit breakers for failing endpoints, and bulk replay.",
      },
      {
        href: "/versioning",
        icon: TagIcon,
        title: "Payload Versioning",
        description:
          "Evolve schemas safely and transform payloads per endpoint version without breaking existing integrations.",
      },
    ],
  },
  {
    title: "Receiving Webhooks",
    cards: [
      {
        href: "/inbound",
        icon: ArrowRightIcon,
        title: "Inbound Forwarding",
        description:
          "Receive third-party webhooks through stable inbound URLs, then forward them to your app with queueing and retries.",
      },
      {
        href: "/verification",
        icon: LockIcon,
        title: "Verifying Signatures",
        description:
          "Verify HMAC signatures on incoming webhooks to confirm authenticity, with secret rotation support.",
      },
    ],
  },
  {
    title: "Security",
    cards: [
      {
        href: "/authentication",
        icon: KeyIcon,
        title: "API Keys & Environments",
        description:
          "Environment-scoped API keys with granular permission scopes for development, staging, and production.",
      },
    ],
  },
  {
    title: "SDKs & Local Dev",
    cards: [
      {
        href: "/sdk/typescript",
        icon: CodeIcon,
        title: "TypeScript SDK",
        description:
          "Ship quickly with typed APIs for webhooks, endpoints, inbound routes, and version management.",
      },
      {
        href: "/sdk/react",
        icon: AtomIcon,
        title: "React SDK",
        description:
          "Use provider-based hooks to manage endpoints and events directly from your React dashboard surfaces.",
      },
      {
        href: "/sdk/cli",
        icon: TerminalIcon,
        title: "CLI & Tunnels",
        description:
          "Forward webhooks to localhost with secure tunnels for realistic local testing and faster debugging.",
      },
    ],
  },
];

const HERO_COLS = 7;
const HERO_ROWS = 5;
const heroGrid = Array.from({ length: HERO_ROWS }, (_, ri) =>
  Array.from({ length: HERO_COLS }, (_, ci) => {
    const d = ci - ri;
    return d >= 0 && d <= 2 ? 1 : 0;
  })
);

const heroFill = "color-mix(in srgb, var(--wallpaper-4) 35%, transparent)";

function HeroBackground() {
  return (
    <div
      className="mask-intersect mask-[linear-gradient(to_bottom,black_30%,transparent_100%),linear-gradient(to_right,transparent_0%,black_20%,black_100%)] pointer-events-none absolute inset-y-0 right-0 w-[55%]"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${HERO_COLS}, 1fr)`,
      }}
    >
      {heroGrid.flatMap((row, ri) =>
        row.map((fill, ci) => (
          <div
            className={cn(
              "aspect-square border-border",
              ci < HERO_COLS - 1 && "border-r",
              ri < HERO_ROWS - 1 && "border-b"
            )}
            key={`hero-${ri}-${ci}`}
            style={fill ? { backgroundColor: heroFill } : undefined}
          />
        ))
      )}
    </div>
  );
}

const featured = featureSections[0].cards;
const rest = featureSections.slice(1);

export const HomePage = () => (
  <div>
    <section className="relative overflow-hidden">
      <HeroBackground />
      <div className="relative z-10 flex flex-col gap-6 px-8 py-20 sm:px-12 sm:py-24">
        <p className="font-medium text-muted-foreground/60 text-xs uppercase tracking-widest">
          Documentation
        </p>
        <h1 className="max-w-2xl font-semibold text-4xl tracking-tight sm:text-5xl">
          Welcome to the Von docs
        </h1>
        <p className="max-w-lg text-lg text-muted-foreground leading-relaxed">
          Reliable webhook delivery with automatic retries, circuit breakers,
          and developer-first tooling.
        </p>
        <div>
          <Button render={<Link href="/getting-started" />} size="xl">
            Quick Start
          </Button>
        </div>
      </div>
    </section>

    <div>
      <div className="grid grid-cols-1 border-border border-y sm:grid-cols-3">
        {featured.map((card, i) => (
          <Link
            className={cn(
              "flex flex-col justify-between gap-16 p-6 transition-colors hover:bg-muted/40 sm:p-10",
              i < featured.length - 1 &&
                "border-border border-b sm:border-r sm:border-b-0"
            )}
            href={card.href}
            key={card.title}
          >
            <p className="text-muted-foreground text-sm leading-relaxed">
              {card.description}
            </p>
            <div className="flex items-center gap-3">
              <card.icon
                className="size-5 shrink-0 text-muted-foreground"
                weight="regular"
              />
              <p className="font-semibold text-sm">{card.title}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="divide-y divide-border">
        {rest.map((section) => (
          <div
            className="flex flex-col gap-4 p-6 sm:flex-row sm:gap-0 sm:p-0"
            key={section.title}
          >
            <div className="flex shrink-0 items-start sm:w-64 sm:px-8 sm:py-4">
              <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
                {section.title}
              </p>
            </div>
            <div className="flex-1 sm:border-border sm:border-l">
              {section.cards.map((card) => (
                <Link
                  className="flex items-start gap-3 border-border border-t px-6 py-4 transition-colors first:border-t-0 hover:bg-muted/40"
                  href={card.href}
                  key={card.title}
                >
                  <card.icon
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    weight="regular"
                  />
                  <div className="flex flex-col gap-0.5">
                    <p className="font-medium text-sm">{card.title}</p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
