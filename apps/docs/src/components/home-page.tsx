"use client";

import {
  AtomIcon,
  BookOpenIcon,
  CodeIcon,
  RocketLaunchIcon,
  TerminalIcon,
} from "@phosphor-icons/react";
import { Card } from "@usevon/ui";
import Link from "next/link";
import type { ReactNode } from "react";

type FeatureCardProps = {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
};

const FeatureCard = (props: FeatureCardProps) => (
  <Link className="group" href={props.href}>
    <Card className="h-full gap-3 p-6 transition-colors hover:border-primary/50">
      <div className="text-primary">{props.icon}</div>
      <h3 className="font-semibold text-foreground">{props.title}</h3>
      <p className="text-muted-foreground text-sm">{props.description}</p>
    </Card>
  </Link>
);

export const HomePage = () => (
  <div className="space-y-8">
    <div className="space-y-2">
      <h1 className="font-bold text-3xl text-foreground tracking-tight">
        Introducing Von documentation
      </h1>
      <p className="text-lg text-muted-foreground">
        Find all the guides and resources you need to develop with Von.
      </p>
    </div>

    <div className="grid gap-6 sm:grid-cols-2">
      <FeatureCard
        description="Get started with Von in under 5 minutes. Learn how to send your first webhook."
        href="/getting-started"
        icon={<RocketLaunchIcon className="size-5" weight="duotone" />}
        title="Quickstarts & Tutorials"
      />
      <FeatureCard
        description="Learn about endpoints, events, verification, and webhook infrastructure."
        href="/introduction"
        icon={<BookOpenIcon className="size-5" weight="duotone" />}
        title="Core Concepts"
      />
    </div>

    <div className="space-y-6">
      <h2 className="font-semibold text-foreground text-xl">SDKs & Tools</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          description="Full-featured SDK with complete type safety for your backend."
          href="/sdk/typescript"
          icon={<CodeIcon className="size-5" weight="duotone" />}
          title="TypeScript SDK"
        />
        <FeatureCard
          description="React hooks and provider for webhook management."
          href="/sdk/react"
          icon={<AtomIcon className="size-5" weight="duotone" />}
          title="React SDK"
        />
        <FeatureCard
          description="Local development with secure tunnels."
          href="/sdk/cli"
          icon={<TerminalIcon className="size-5" weight="duotone" />}
          title="CLI"
        />
      </div>
    </div>
  </div>
);
