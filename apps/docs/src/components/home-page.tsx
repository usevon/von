"use client";

import Link from "next/link";
import { RocketLaunchIcon, AtomIcon, BookOpenIcon, TerminalIcon, CodeIcon } from "@phosphor-icons/react";
import { Card } from "@usevon/ui";
import type { ReactNode } from "react";

type FeatureCardProps = {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
};

const FeatureCard = (props: FeatureCardProps) => {
  return (
    <Link href={props.href} className="group">
      <Card className="h-full gap-3 p-6 transition-colors hover:border-primary/50">
        <div className="text-primary">{props.icon}</div>
        <h3 className="font-semibold text-foreground">{props.title}</h3>
        <p className="text-sm text-muted-foreground">{props.description}</p>
      </Card>
    </Link>
  );
};


export const HomePage = () => {
  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Introducing Von documentation
        </h1>
        <p className="text-lg text-muted-foreground">
          Find all the guides and resources you need to develop with Von.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <FeatureCard
          href="/getting-started"
          icon={<RocketLaunchIcon className="size-5" weight="duotone" />}
          title="Quickstarts & Tutorials"
          description="Get started with Von in under 5 minutes. Learn how to send your first webhook."
        />
        <FeatureCard
          href="/introduction"
          icon={<BookOpenIcon className="size-5" weight="duotone" />}
          title="Core Concepts"
          description="Learn about endpoints, events, verification, and webhook infrastructure."
        />
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">SDKs & Tools</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            href="/sdk/typescript"
            icon={<CodeIcon className="size-5" weight="duotone" />}
            title="TypeScript SDK"
            description="Full-featured SDK with complete type safety for your backend."
          />
          <FeatureCard
            href="/sdk/react"
            icon={<AtomIcon className="size-5" weight="duotone" />}
            title="React SDK"
            description="React hooks and provider for webhook management."
          />
          <FeatureCard
            href="/sdk/cli"
            icon={<TerminalIcon className="size-5" weight="duotone" />}
            title="CLI"
            description="Local development with secure tunnels."
          />
        </div>
      </div>
    </div>
  );
};
