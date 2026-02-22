"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  AtomIcon,
  BookOpenIcon,
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
        href: "/comparison",
        icon: BookOpenIcon,
        title: "Von vs Others",
        description:
          "Compare Von with Svix and Hookdeck across reliability, inbound routing, and payload versioning.",
      },
      {
        href: "/hosting",
        icon: HouseIcon,
        title: "Cloud or Self-Hosted",
        description:
          "Choose Von Cloud for fast setup, or self-host for full infrastructure and data control.",
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

const FeatureCard = (props: FeatureCardProps) => (
  <Link
    className="flex h-full flex-col gap-3 border border-border bg-muted/60 px-6 py-5 transition-colors hover:bg-muted"
    href={props.href}
  >
    <props.icon
      className="mb-2 size-6 text-muted-foreground"
      weight="regular"
    />
    <h3 className="font-medium text-lg">{props.title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">
      {props.description}
    </p>
  </Link>
);

const staircaseGrid = [
  [0, 0, 0, 1, 1, 1, 1],
  [0, 0, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
] as const;

const COLS = 7;

function HeroBackground() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(100% 100% at 100% 100%, #6366f1 0%, var(--background) 60%)",
        }}
      />
      <div
        className="mask-intersect mask-[linear-gradient(to_top,black_0%,black_50%,transparent_100%),linear-gradient(to_right,transparent_0%,black_30%,black_100%)] pointer-events-none absolute right-0 bottom-0 left-[30%] z-10"
        style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
      >
        {staircaseGrid.flatMap((row, ri) =>
          row.map((fill, ci) => (
            <div
              className={cn(
                "aspect-square border-border",
                ci < COLS - 1 && "border-r",
                ri < staircaseGrid.length - 1 && "border-b"
              )}
              key={`hero-${ri}-${ci}`}
              style={
                fill
                  ? {
                      backgroundColor:
                        "color-mix(in srgb, var(--wallpaper-4) 35%, transparent)",
                    }
                  : undefined
              }
            />
          ))
        )}
      </div>
    </>
  );
}

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
        <p className="max-w-lg text-lg text-muted-foreground">
          Von is a webhook infrastructure platform for reliable delivery,
          retries, signature verification, and developer-first tooling.
        </p>
        <div>
          <Button render={<Link href="/getting-started" />} size="xl">
            Quick Start
          </Button>
        </div>
      </div>
    </section>

    <div className="space-y-8 p-6 pb-14 sm:space-y-10 sm:p-8 sm:pb-16">
      {featureSections.map((section) => (
        <section className="space-y-3" key={section.title}>
          <p className="font-medium text-muted-foreground/60 text-xs uppercase tracking-widest">
            {section.title}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {section.cards.map((card) => (
              <FeatureCard
                description={card.description}
                href={card.href}
                icon={card.icon}
                key={card.title}
                title={card.title}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  </div>
);
