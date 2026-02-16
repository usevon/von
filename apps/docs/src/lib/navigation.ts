export type NavLink = {
  title: string;
  href: string;
  icon?: string;
  external?: boolean;
};

export type NavSection = {
  title: string;
  items: NavLink[];
};

export const topLinks: NavLink[] = [
  { title: "Home", href: "/", icon: "house" },
];

export const navigation: NavSection[] = [
  {
    title: "Start Here",
    items: [
      { title: "Quick Start", href: "/getting-started" },
      { title: "Von vs Others", href: "/comparison" },
      { title: "Cloud or Self-Hosted", href: "/hosting" },
    ],
  },
  {
    title: "Sending Webhooks",
    items: [
      { title: "Endpoints", href: "/endpoints" },
      { title: "Events & Deliveries", href: "/events-deliveries" },
      { title: "Retries & Recovery", href: "/retries-recovery" },
      { title: "Payload Versioning", href: "/versioning" },
    ],
  },
  {
    title: "Receiving Webhooks",
    items: [
      { title: "Inbound Forwarding", href: "/inbound" },
      { title: "Verifying Signatures", href: "/verification" },
    ],
  },
  {
    title: "Security",
    items: [
      { title: "API Keys & Environments", href: "/authentication" },
    ],
  },
  {
    title: "SDKs & Local Dev",
    items: [
      { title: "TypeScript SDK", href: "/sdk/typescript" },
      { title: "React SDK", href: "/sdk/react" },
      { title: "CLI & Tunnels", href: "/sdk/cli" },
    ],
  },
  {
    title: "LLMs",
    items: [
      { title: "llms.txt", href: "/llms.txt", external: true },
      { title: "llms-full.txt", href: "/llms-full.txt", external: true },
    ],
  },
];
