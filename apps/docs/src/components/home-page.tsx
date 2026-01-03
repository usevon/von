"use client";

import Link from "next/link";
import {
  RocketLaunchIcon,
  AtomIcon,
  BookOpenIcon,
  TerminalIcon,
  CodeIcon,
} from "@phosphor-icons/react";
import { cn } from "@usevon/ui";
import type { ReactNode } from "react";

type FeatureCardProps = {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
};

const FeatureCard = (props: FeatureCardProps) => {
  return (
    <Link
      href={props.href}
      className={cn(
        "group flex flex-col gap-3 rounded-xl border border-border bg-card p-6",
        "transition-colors hover:border-primary/50 hover:bg-card/80"
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {props.icon}
      </div>
      <h3 className="font-semibold text-foreground">{props.title}</h3>
      <p className="text-sm text-muted-foreground">{props.description}</p>
    </Link>
  );
};

type SdkCardProps = {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
};

const SdkCard = (props: SdkCardProps) => {
  return (
    <Link
      href={props.href}
      className={cn(
        "group flex items-start gap-4 rounded-lg border border-border bg-card p-4",
        "transition-colors hover:border-primary/50 hover:bg-card/80"
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
        {props.icon}
      </div>
      <div>
        <h4 className="font-medium text-foreground">{props.title}</h4>
        <p className="mt-1 text-sm text-muted-foreground">{props.description}</p>
      </div>
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

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          href="/getting-started"
          icon={<RocketLaunchIcon className="size-5" weight="duotone" />}
          title="Quickstarts & Tutorials"
          description="Get started with Von in under 5 minutes. Learn how to send your first webhook."
        />
        <FeatureCard
          href="/sdk/react"
          icon={<AtomIcon className="size-5" weight="duotone" />}
          title="React SDK"
          description="React hooks and provider for integrating webhooks into your frontend."
        />
        <FeatureCard
          href="/introduction"
          icon={<BookOpenIcon className="size-5" weight="duotone" />}
          title="Core Concepts"
          description="Learn about endpoints, events, verification, and webhook infrastructure."
        />
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground">Explore by SDK</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SdkCard
            href="/sdk/typescript"
            icon={<CodeIcon className="size-5" weight="duotone" />}
            title="TypeScript SDK"
            description="Full-featured SDK with complete type safety"
          />
          <SdkCard
            href="/sdk/react"
            icon={<AtomIcon className="size-5" weight="duotone" />}
            title="React SDK"
            description="React hooks and provider for webhook management"
          />
          <SdkCard
            href="/sdk/cli"
            icon={<TerminalIcon className="size-5" weight="duotone" />}
            title="CLI"
            description="Local development with secure tunnels"
          />
        </div>
      </div>
    </div>
  );
};
