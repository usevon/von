import { Tabs } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";
import { Code } from "./code";
import { Wallpaper } from "./wallpaper";

const workflowSteps = [
  { value: "connect", label: "Connect" },
  { value: "verify", label: "Verify" },
  { value: "monitor", label: "Monitor" },
  { value: "inbound", label: "Inbound" },
  { value: "tunnels", label: "Tunnels" },
] as const;

const panelClass = "grid h-full w-full place-items-center px-6";

export function WorkflowTabs() {
  return (
    <Tabs.Root className="flex flex-col" defaultValue="connect">
      <Tabs.List className="relative z-0 flex h-14 border border-border sm:grid sm:grid-cols-5">
        {workflowSteps.map((step, index) => (
          <Tabs.Tab
            className={cn(
              "min-w-0 flex-1 cursor-pointer text-center font-medium text-muted-foreground text-base transition-colors hover:text-foreground data-active:text-foreground sm:text-sm",
              index < workflowSteps.length - 1 && "border-r border-r-border",
            )}
            key={step.value}
            value={step.value}
          >
            {step.label}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator className="absolute top-0 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) bg-accent transition-[width,translate] duration-200 ease-in-out" />
      </Tabs.List>

      <Wallpaper className="h-140 border-border border-x sm:h-160">
        <Tabs.Panel className={panelClass} value="connect">
          <Code>
            {`import { Von } from "@usevon/sdk";

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
});`}
          </Code>
        </Tabs.Panel>

        <Tabs.Panel className={panelClass} value="verify">
          <Code>
            {`import { verifyWebhook } from "@usevon/sdk";

app.post("/webhooks", async (req) => {
  const payload = await req.text();
  const signature = req.headers
    .get("x-von-signature");

  const event = verifyWebhook(
    payload,
    signature,
    process.env.WEBHOOK_SECRET,
  );

  // event.type, event.data
});`}
          </Code>
        </Tabs.Panel>

        <Tabs.Panel className={panelClass} value="monitor">
          <Code>
            {`const event = await von.events.get("evt_a1b2c3");

console.log(event.type);
console.log(event.deliveries);
console.log(event.circuitBreaker);

// Replay a failed delivery
await von.events.replay("evt_a1b2c3");`}
          </Code>
        </Tabs.Panel>

        <Tabs.Panel className={panelClass} value="inbound">
          <Code>
            {`const inbound = await von.inbound.post({
  name: "Stripe Payments",
  provider: "stripe",
  forwardUrl: "https://your-app.com/hooks",
});

console.log(inbound.url);
// https://api.usevon.com/in/inb_a1b2c3`}
          </Code>
        </Tabs.Panel>

        <Tabs.Panel className={panelClass} value="tunnels">
          <Code>
            {`$ von dev -p 3000

  1 tunnel ready

  3000  https://api.usevon.com/t/tn_x7k9m2

  Press Ctrl+C to stop

  14:23:01  3000  POST  /webhooks  200  12ms
  14:23:02  3000  POST  /webhooks  200   8ms`}
          </Code>
        </Tabs.Panel>
      </Wallpaper>
    </Tabs.Root>
  );
}
