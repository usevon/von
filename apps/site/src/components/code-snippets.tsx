"use client";

import { useState } from "react";
import { Card, Tabs, TabsList, TabsTab, TabsPanel, CodeBlock } from "@usevon/ui";
import { Wallpaper } from "./wallpaper";

const steps = [
  {
    id: "setup",
    title: "Setup",
    label: "Initialize the client",
    description: "Add your API key and you're ready to go.",
    lines: [2, 3, 4],
  },
  {
    id: "send",
    title: "Send",
    label: "Send your first event",
    description: "Automatic retries, monitoring, and verification included.",
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
  const [activeTab, setActiveTab] = useState("setup");
  const activeStep = steps.find((s) => s.id === activeTab) || steps[0];
  const activeLines = new Set(activeStep.lines);

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
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="flex flex-col justify-between border-0 bg-muted/50 p-4 dark:bg-white/5">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                {steps.map((step, index) => (
                  <TabsTab key={step.id} value={step.id}>
                    {index + 1}. {step.title}
                  </TabsTab>
                ))}
              </TabsList>
              {steps.map((step) => (
                <TabsPanel key={step.id} value={step.id} className="flex-1" />
              ))}
            </Tabs>
            <div>
              <h3 className="text-2xl font-semibold">{activeStep.label}</h3>
              <p className="mt-2 text-muted-foreground">{activeStep.description}</p>
            </div>
          </Card>

          <Wallpaper className="rounded-2xl p-4">
            <CodeBlock
              code={code}
              activeLines={activeLines}
              preClassName="border-0 bg-background/95 shadow-2xl backdrop-blur"
            />
          </Wallpaper>
        </div>
      </div>
    </section>
  );
};
