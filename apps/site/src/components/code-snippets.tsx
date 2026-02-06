"use client";

import Link from "next/link";
import { Tabs } from "@base-ui/react/tabs";
import { Card, CodeBlock } from "@usevon/ui";
import { Wallpaper } from "./wallpaper";
import { docsUrl } from "@/lib/urls";

const steps = [
  {
    id: "setup",
    title: "Setup",
    label: "Initialize the client",
    description: "Install the SDK and add your API key.",
    href: docsUrl("/getting-started"),
    lines: [2, 3, 4],
  },
  {
    id: "send",
    title: "Send",
    label: "Send your first event",
    description: "Von handles retries and delivery for you.",
    href: docsUrl("/sending"),
    lines: [6, 7, 8, 9, 10, 11, 12, 13],
  },
];

const code = `import { Von } from "@usevon/sdk";

const von = new Von({
  apiKey: process.env.VON_API_KEY,
});

await von.webhooks.send({
  event: "user.created",
  endpoint: "https://api.example.com/webhooks",
  payload: {
    id: "user_123",
    email: "user@example.com",
  },
});`;

export const CodeSnippets = () => {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mb-16 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Ship webhooks in minutes, not weeks.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Two API calls and you're done.
          </p>
        </div>
        <Tabs.Root defaultValue="setup">
          <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 lg:gap-4">
            <Card className="flex flex-col justify-between border-0 bg-muted/50 p-4 dark:bg-white/5 max-lg:rounded-t-none">
              <Tabs.List className="relative inline-flex self-start rounded-lg bg-muted p-1 dark:bg-black/20">
                <Tabs.Indicator
                  className="absolute rounded-md bg-background shadow-sm transition-all duration-200 dark:bg-zinc-800"
                  style={{
                    height: "var(--active-tab-height)",
                    width: "var(--active-tab-width)",
                    left: "var(--active-tab-left)",
                    top: "var(--active-tab-top)",
                  }}
                />
                {steps.map((step, i) => (
                  <Tabs.Tab
                    key={step.id}
                    value={step.id}
                    className="relative z-10 h-9 rounded-md px-3 text-base font-medium text-muted-foreground transition-colors hover:text-foreground data-[active]:text-foreground sm:h-8 sm:text-sm"
                  >
                    {i + 1}. {step.title}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
              {steps.map((step) => (
                <Tabs.Panel key={step.id} value={step.id} className="flex flex-col gap-3 pt-4">
                  <h3 className="text-3xl font-semibold">{step.label}</h3>
                  <p className="text-lg text-muted-foreground">{step.description}</p>
                  <Link
                    href={step.href}
                    className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Learn more
                  </Link>
                </Tabs.Panel>
              ))}
            </Card>

            <Wallpaper className="rounded-2xl p-4 max-lg:rounded-b-none">
              {steps.map((step) => (
                <Tabs.Panel key={step.id} value={step.id}>
                  <CodeBlock
                    code={code}
                    activeLines={new Set(step.lines)}
                    preClassName="border-0 bg-background/95 shadow-2xl backdrop-blur"
                  />
                </Tabs.Panel>
              ))}
            </Wallpaper>
          </div>
        </Tabs.Root>
      </div>
    </section>
  );
};
