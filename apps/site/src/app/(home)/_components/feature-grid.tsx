import type { Icon } from "@phosphor-icons/react";
import {
  ArrowCounterClockwiseIcon,
  ShieldWarningIcon,
  TagIcon,
  LockIcon,
  ArrowBendDownRightIcon,
  TerminalIcon,
} from "@phosphor-icons/react/ssr";

const features: { title: string; description: string; icon: Icon }[] = [
  {
    title: "Automatic retries",
    description:
      "Failed deliveries are retried with configurable exponential backoff so nothing gets lost.",
    icon: ArrowCounterClockwiseIcon,
  },
  {
    title: "Circuit breakers",
    description:
      "Failing endpoints are automatically paused to prevent cascading failures.",
    icon: ShieldWarningIcon,
  },
  {
    title: "Payload versioning",
    description:
      "Transform payloads on the fly without breaking changes for your users.",
    icon: TagIcon,
  },
  {
    title: "Signed & verified",
    description:
      "Every webhook is signed with replay protection and can be verified in a single function call.",
    icon: LockIcon,
  },
  {
    title: "Inbound forwarding",
    description:
      "Receive third-party webhooks through a permanent URL with queuing and retries.",
    icon: ArrowBendDownRightIcon,
  },
  {
    title: "Local dev tunnels",
    description:
      "Test webhooks on localhost with built-in tunnels and no third-party tools required.",
    icon: TerminalIcon,
  },
];

export function FeatureGrid() {
  return (
    <section>
      <div className="flex flex-col gap-4 px-8 pt-24 pb-16 sm:px-12">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
          Features
        </p>
        <h2 className="max-w-[20ch] font-semibold text-3xl tracking-tight sm:text-4xl">
          Reliable webhook delivery,{" "}
          <span className="text-foreground/50">
            out of the box.
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 border-border border-t sm:grid-cols-2 lg:grid-cols-3 [&>*]:border-border [&>*]:border-b [&>*]:sm:border-r [&>*:nth-child(2n)]:sm:border-r-0 [&>*:nth-child(2n)]:lg:border-r [&>*:nth-child(3n)]:lg:border-r-0">
        {features.map((feature, index) => (
          <div
            className="flex flex-col gap-3 p-8 sm:p-10"
            key={feature.title}
          >
            <feature.icon className="mb-4 size-6 text-muted-foreground" weight="regular" />
            <h3 className="font-medium text-lg">{feature.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
