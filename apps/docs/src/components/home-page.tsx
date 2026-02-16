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

const sideGridCells = [
  [10, 18, 26, 34, 35, 35, 35],
  [0, 10, 18, 26, 34, 35, 30],
  [0, 0, 10, 18, 26, 30, 18],
  [0, 0, 0, 10, 18, 20, 0],
  [0, 0, 0, 0, 10, 0, 0],
] as const;

const mirroredGridCells = sideGridCells.map((row) => [...row].reverse());

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
    className="flex h-full flex-col gap-3 border border-border bg-background px-6 py-5 transition-colors hover:bg-accent/50"
    href={props.href}
  >
    <props.icon className="mb-2 size-6 text-muted-foreground" weight="regular" />
    <h3 className="font-medium text-lg">{props.title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">
      {props.description}
    </p>
  </Link>
);

function SideSquares(props: { side: "left" | "right" }) {
  const cells = props.side === "left" ? sideGridCells : mirroredGridCells;

  return (
    <div
      className={`pointer-events-none absolute top-0 hidden w-1/2 opacity-80 sm:grid ${props.side === "left" ? "left-0 [mask-image:linear-gradient(to_right,transparent_0%,black_18%,black_100%)]" : "right-0 [mask-image:linear-gradient(to_left,transparent_0%,black_18%,black_100%)]"}`}
      style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
    >
      {cells.flatMap((row, ri) =>
        row.map((fill, ci) => {
          const isLastRow = ri === cells.length - 1;
          const isLastCol = ci === row.length - 1;

          return (
            <div
              className={`aspect-square border-border ${!isLastCol ? "border-r" : ""} ${!isLastRow ? "border-b" : ""}`}
              key={`${props.side}-${ri}-${ci}`}
              style={
                fill
                  ? {
                      backgroundColor: `color-mix(in srgb, var(--wallpaper-4) ${fill}%, transparent)`,
                    }
                  : undefined
              }
            />
          );
        })
      )}
    </div>
  );
}

export const HomePage = () => (
  <div>
    <section className="relative overflow-hidden">
      <SideSquares side="left" />
      <SideSquares side="right" />

      <div className="relative z-10 flex flex-col items-center gap-4 px-6 py-14 text-center sm:py-16">
        <p className="font-medium text-muted-foreground/60 text-xs uppercase tracking-widest">
          Documentation
        </p>
        <h1 className="max-w-3xl font-semibold text-4xl tracking-tight sm:text-5xl">
          Welcome to the Von documentation
        </h1>
        <p className="max-w-2xl text-muted-foreground text-lg">
          Von is a webhook infrastructure platform for reliable delivery,
          retries, signature verification, and developer-first tooling.
        </p>
        <div className="mt-2 flex flex-col items-center gap-2">
          <Button render={<Link href="/getting-started" />} size="xl">
            Quick Start
          </Button>
          <p className="text-muted-foreground text-sm">
            Get started with Von in under 5 minutes.
          </p>
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
