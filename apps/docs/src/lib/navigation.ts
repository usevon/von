export type NavLink = {
  title: string;
  href: string;
  icon?: string;
};

export type NavSection = {
  title: string;
  items: NavLink[];
};

export const topLinks: NavLink[] = [
  { title: "Home", href: "/", icon: "house" },
  { title: "Getting Started", href: "/getting-started", icon: "rocket-launch" },
  { title: "Authentication", href: "/authentication", icon: "key" },
];

export const navigation: NavSection[] = [
  {
    title: "Core Concepts",
    items: [
      { title: "Introduction", href: "/introduction" },
      { title: "Sending Webhooks", href: "/sending" },
      { title: "Receiving Webhooks", href: "/receiving" },
      { title: "Verification", href: "/verification" },
      { title: "Versioning", href: "/versioning" },
    ],
  },
  {
    title: "SDK Reference",
    items: [
      { title: "TypeScript SDK", href: "/sdk/typescript" },
      { title: "React SDK", href: "/sdk/react" },
      { title: "CLI", href: "/sdk/cli" },
    ],
  },
  {
    title: "Resources",
    items: [
      { title: "llms.txt", href: "/llms.txt" },
    ],
  },
];
