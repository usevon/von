"use client";

import {
  CaretUpDownIcon,
  CheckIcon,
  GearSixIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SignOutIcon,
  SunIcon,
} from "@phosphor-icons/react";
import { cn } from "@usevon/ui/lib/utils";
import { useTheme } from "next-themes";
import { useState } from "react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Dialog,
  DialogClose,
  DialogFooter,
  DialogPopup,
  DialogTrigger,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Menu,
  MenuGroup,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
  ScrollArea,
  Separator,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@usevon/ui";

const teams = [
  { name: "Demo Org", slug: "demo-org", plan: "Free" },
  { name: "Acme Inc", slug: "acme-inc", plan: "Pro" },
  { name: "Personal", slug: "personal", plan: "Free" },
];

const user = {
  name: "Kyle Graham Matzen",
  email: "hello@kylegm.com",
  initials: "KM",
};

const itemClass = "py-2 px-2.5 text-sm";
const kbdClass = "border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground";

const navTabs = ["Overview", "Webhooks", "Queue", "Documentation"] as const;

export default function TestPage() {
  const [activeTeam, setActiveTeam] = useState(teams[0]);

  return (
    <div className="flex min-h-svh flex-col bg-muted">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between px-5">
        <Menu>
          <MenuTrigger className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent focus-visible:outline-none">
            <Avatar className="size-6 rounded-md">
              <AvatarFallback className="rounded-md bg-foreground text-[10px] text-background">
                {activeTeam.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{activeTeam.name}</span>
            <CaretUpDownIcon className="size-3.5 text-muted-foreground" />
          </MenuTrigger>
          <TeamDropdown activeTeam={activeTeam} onTeamChange={setActiveTeam} />
        </Menu>

        <Menu>
          <MenuTrigger className="flex cursor-pointer items-center focus-visible:outline-none">
            <Avatar className="size-8">
              <AvatarFallback className="bg-foreground text-background text-xs">
                {user.initials}
              </AvatarFallback>
            </Avatar>
          </MenuTrigger>
          <AccountDropdown />
        </Menu>
      </header>

      {/* Content area */}
      <div className="mx-2 flex min-h-0 flex-1 flex-col rounded-t-xl border-border border-t border-r border-l bg-background">
        <div className="px-8 pt-8">
          <h1 className="font-semibold text-2xl tracking-tight">Webhooks</h1>
          <p className="mt-1 text-muted-foreground text-sm">Last 24 hours activity</p>
        </div>

        <Tabs defaultValue="overview" className="mt-6 flex-1">
          <div className="mx-8 border-border border-b">
            <TabsList variant="underline">
              {navTabs.map((tab) => (
                <TabsTab key={tab} value={tab.toLowerCase()}>
                  {tab}
                </TabsTab>
              ))}
            </TabsList>
          </div>

          <TabsPanel value="overview" className="px-8 py-6">
            <OverviewContent />
          </TabsPanel>
          {navTabs.slice(1).map((tab) => (
            <TabsPanel key={tab} value={tab.toLowerCase()} className="px-8 py-6" />
          ))}
        </Tabs>
      </div>
    </div>
  );
}

/** ── Data ── */
const kpis = [
  { label: "Total Webhooks Sent", value: "458" },
  { label: "Successful", value: "424" },
  { label: "Failed", value: "29" },
  { label: "Pending", value: "5" },
  { label: "Retry Rate", value: "50%" },
  { label: "Avg Latency", value: "8.9ms" },
];

const recentQueue = [
  { status: 200, event: "order:created", url: "https://...example.com" },
  { status: 500, event: "order:cancelled:product", url: "https://...example.com" },
  { status: 200, event: "order:paid:product", url: "https://...example.com" },
  { status: 200, event: "order:updated", url: "https://...example.com" },
  { status: 200, event: "order:partial", url: "https://...example.com" },
];

const latencyData = [
  { label: "P50", value: "1.4119 ms" },
  { label: "P90", value: "3.8811 ms" },
  { label: "P95", value: "5.9932 ms" },
  { label: "P99", value: "43.97 ms" },
];

const topEventsShort = [
  { name: "order:created", count: 142 },
  { name: "api_key.created", count: 98 },
  { name: "order:cancelled:product", count: 76 },
  { name: "order:paid:product", count: 64 },
  { name: "invoice.finalized", count: 41 },
];

const topEventsAll = [
  ...topEventsShort,
  { name: "customer.subscription.updated", count: 38 },
  { name: "payment_intent.succeeded", count: 35 },
  { name: "charge.refunded", count: 29 },
  { name: "invoice.payment_failed", count: 22 },
  { name: "customer.created", count: 18 },
  { name: "order:updated", count: 15 },
  { name: "webhook.endpoint.updated", count: 12 },
];

const maxEventCount = topEventsAll[0].count;

const hourlyData = [
  [32, 2], [18, 0], [12, 1], [8, 0], [6, 0], [10, 0],
  [15, 1], [22, 3], [28, 2], [35, 1], [40, 5], [38, 3],
  [42, 2], [36, 4], [30, 1], [25, 2], [20, 0], [18, 1],
  [22, 3], [28, 5], [32, 2], [24, 1], [16, 0], [10, 0],
];

/** ── Overview layout ── */
function OverviewContent() {
  return (
    <div>
      <KpiCards />
      <div className="grid grid-cols-1 pt-4 md:grid-cols-[3fr_2fr]">
        <div className="space-y-4 pb-4 md:border-border md:border-r md:pr-8">
          <HourlyActivity />
          <Separator />
          <Latency />
        </div>
        <Separator className="md:hidden" />
        <div className="space-y-4 pt-4 md:pt-0 md:pl-8">
          <RecentQueue />
          <Separator />
          <TopEvents />
        </div>
      </div>
    </div>
  );
}

/**
 * Stat grid with explicit separator tracks.
 * Content cells in odd tracks, border lines in even tracks, intersections empty.
 */
function StatGrid({
  items,
  mobileCols,
  gapSize = "1.5rem",
  valueClassName = "text-2xl",
  className,
}: {
  items: { label: string; value: string }[];
  mobileCols: number;
  gapSize?: string;
  valueClassName?: string;
  className?: string;
}) {
  const bp = items.length > 4 ? "md" : "sm";
  const hideClass = bp === "sm" ? "sm:hidden" : "md:hidden";
  const showClass = bp === "sm" ? "hidden sm:block" : "hidden md:block";

  return (
    <div className={className}>
      <div className={hideClass}>
        <StatGridInner items={items} cols={mobileCols} gapSize={gapSize} valueClassName={valueClassName} />
      </div>
      <div className={showClass}>
        <StatGridInner items={items} cols={items.length} gapSize={gapSize} valueClassName={valueClassName} />
      </div>
    </div>
  );
}

function StatGridInner({
  items,
  cols,
  gapSize,
  valueClassName,
}: {
  items: { label: string; value: string }[];
  cols: number;
  gapSize: string;
  valueClassName: string;
}) {
  const rows = Math.ceil(items.length / cols);

  const colTemplate = Array.from({ length: cols }, (_, i) =>
    i < cols - 1 ? `1fr ${gapSize}` : "1fr"
  ).join(" ");

  const rowTemplate = Array.from({ length: rows }, (_, i) =>
    i < rows - 1 ? `auto ${gapSize}` : "auto"
  ).join(" ");

  return (
    <div style={{ display: "grid", gridTemplateColumns: colTemplate, gridTemplateRows: rowTemplate }}>
      {items.map((item, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        return (
          <div key={item.label} style={{ gridColumn: col * 2 + 1, gridRow: row * 2 + 1 }}>
            <span className="text-muted-foreground text-xs">{item.label}</span>
            <p className={cn("mt-1 font-semibold", valueClassName)}>{item.value}</p>
          </div>
        );
      })}
      {Array.from({ length: cols - 1 }, (_a, ci) =>
        Array.from({ length: rows }, (_b, ri) => (
          <div
            key={`v${ci}${ri}`}
            className="flex justify-center"
            style={{ gridColumn: (ci + 1) * 2, gridRow: ri * 2 + 1 }}
          >
            <div className="h-full border-border border-l" />
          </div>
        ))
      )}
      {Array.from({ length: rows - 1 }, (_a, ri) =>
        Array.from({ length: cols }, (_b, ci) => (
          <div
            key={`h${ri}${ci}`}
            className="flex items-center"
            style={{ gridColumn: ci * 2 + 1, gridRow: (ri + 1) * 2 }}
          >
            <div className="w-full border-border border-t" />
          </div>
        ))
      )}
    </div>
  );
}

function KpiCards() {
  return (
    <StatGrid
      items={kpis}
      mobileCols={3}
      className="border-border border-b pb-4"
    />
  );
}

function HourlyActivity() {
  return (
    <div>
      <h3 className="font-medium text-sm">Hourly Activity</h3>
      <div className="mt-2 flex h-48 items-end gap-1">
        {hourlyData.map(([success, failed], i) => {
          const total = success + failed;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-px">
              <div className="flex w-full flex-col gap-px" style={{ height: `${(total / 50) * 100}%` }}>
                <div className="flex-1 bg-emerald-500/80" />
                {failed > 0 && (
                  <div className="bg-destructive/80" style={{ height: `${(failed / total) * 100}%` }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>3:00</span>
        <span>9:00</span>
        <span>15:00</span>
        <span>21:00</span>
      </div>
    </div>
  );
}

function Latency() {
  return (
    <div>
      <h3 className="font-medium text-sm">Latency</h3>
      <StatGrid
        items={latencyData}
        mobileCols={2}
        valueClassName="text-lg"
        className="mt-2"
      />
    </div>
  );
}

/** ── Recent Queue ── */
function QueueRow({ item, last }: { item: (typeof recentQueue)[number]; last?: boolean }) {
  return (
    <div className={`grid grid-cols-[5.5rem_1fr] items-center gap-x-4 py-2.5 sm:grid-cols-[5.5rem_1fr_10rem] ${last ? "" : "border-border border-b"}`}>
      <Badge variant={item.status < 400 ? "success" : "error"} className="w-fit font-mono text-[11px]">
        {item.status}
      </Badge>
      <span className="text-sm">{item.event}</span>
      <span className="truncate text-right text-muted-foreground text-xs">{item.url}</span>
    </div>
  );
}

function QueueHeader() {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-center gap-x-4 border-border border-b py-2 text-muted-foreground text-xs sm:grid-cols-[5.5rem_1fr_10rem]">
      <span className="whitespace-nowrap">Response Code</span>
      <span>Event</span>
      <span className="text-right">Target URL</span>
    </div>
  );
}

function RecentQueue() {
  const [search, setSearch] = useState("");
  const filtered = recentQueue.filter((item) =>
    item.event.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h3 className="font-medium text-sm">Recent Queue</h3>
      <div className="mt-2">
        <QueueHeader />
        {recentQueue.slice(0, 5).map((item, i, arr) => (
          <QueueRow key={i} item={item} last={i === arr.length - 1} />
        ))}
      </div>
      <div className="mt-2 flex justify-center">
        <Dialog>
          <DialogTrigger render={<Button variant="secondary" />}>
            Show more
          </DialogTrigger>
          <DialogPopup>
            <div className="space-y-3 border-border border-b px-6 pt-4 pb-4">
              <h2 className="font-heading text-xl leading-none">Recent Queue</h2>
            <InputGroup>
              <InputGroupAddon>
                <MagnifyingGlassIcon className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search event..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              />
            </InputGroup>
          </div>
          <div className="px-6 pt-4">
            <QueueHeader />
          </div>
          <ScrollArea scrollFade className="max-h-80 px-6 pb-4">
            {filtered.length > 0 ? (
              filtered.map((item, i) => (
                <QueueRow key={i} item={item} />
              ))
            ) : (
              <p className="py-8 text-center text-muted-foreground text-sm">No results.</p>
            )}
          </ScrollArea>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="w-full" />}>
              Go back
            </DialogClose>
          </DialogFooter>
          </DialogPopup>
        </Dialog>
      </div>
    </div>
  );
}

/** ── Top Events ── */
function BarItem({ name, count }: { name: string; count: number }) {
  const pct = (count / maxEventCount) * 100;
  return (
    <div className="group flex items-center justify-between gap-4 hover:bg-accent/50">
      <div className="relative w-full">
        <div className="flex h-9 items-center bg-accent group-hover:bg-accent" style={{ width: `${Math.max(pct, 2)}%` }}>
          <span className="absolute left-2 truncate whitespace-nowrap text-sm">{name}</span>
        </div>
      </div>
      <span className="shrink-0 pr-1 text-sm tabular-nums">{count.toLocaleString()}</span>
    </div>
  );
}

function ShowMoreDialog({
  title,
  items,
  searchPlaceholder = "Search...",
  columnLabels,
}: {
  title: string;
  items: { name: string; count: number }[];
  searchPlaceholder?: string;
  columnLabels: [string, string];
}) {
  const [search, setSearch] = useState("");
  const filtered = items.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DialogPopup>
      <div className="space-y-3 border-border border-b px-6 pt-4 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl leading-none">{title}</h2>
          <span className="font-medium text-muted-foreground text-xs uppercase">{columnLabels[1]}</span>
        </div>
        <InputGroup>
          <InputGroupAddon>
            <MagnifyingGlassIcon className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </InputGroup>
      </div>
      <ScrollArea scrollFade className="max-h-96 px-6 py-4">
        <div className="space-y-1.5">
        {filtered.length > 0 ? (
          filtered.map((e) => (
            <BarItem key={e.name} name={e.name} count={e.count} />
          ))
        ) : (
          <p className="py-8 text-center text-muted-foreground text-sm">No results.</p>
        )}
        </div>
      </ScrollArea>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" className="w-full" />}>
          Go back
        </DialogClose>
      </DialogFooter>
    </DialogPopup>
  );
}

function TopEvents() {
  return (
    <div>
      <h3 className="font-medium text-sm">Top Events</h3>
      <div className="mt-2 flex items-center justify-between text-muted-foreground text-xs">
        <span>Event</span>
        <span>Count</span>
      </div>
      <div className="mt-2 space-y-1.5">
        {topEventsShort.map((e) => (
          <BarItem key={e.name} name={e.name} count={e.count} />
        ))}
      </div>
      <div className="mt-2 flex justify-center">
        <Dialog>
          <DialogTrigger render={<Button variant="secondary" />}>
            Show more
          </DialogTrigger>
        <ShowMoreDialog
          title="Top Events"
          items={topEventsAll}
          searchPlaceholder="Search event..."
          columnLabels={["Event", "Count"]}
        />
        </Dialog>
      </div>
    </div>
  );
}

/** ── Dropdowns ── */
type DropdownProps = {
  activeTeam: (typeof teams)[number];
  onTeamChange: (team: (typeof teams)[number]) => void;
};

function TeamDropdown({ activeTeam, onTeamChange }: DropdownProps) {
  return (
    <MenuPopup align="start" sideOffset={6} className="w-64">
      <MenuGroup>
        {teams.map((team, i) => (
          <MenuItem
            key={team.slug}
            onClick={() => onTeamChange(team)}
            className={`${itemClass} justify-between`}
          >
            <div className="flex items-center gap-2.5">
              <Avatar className="size-6 rounded-md">
                <AvatarFallback className="rounded-md bg-foreground text-[10px] text-background">
                  {team.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span>{team.name}</span>
            </div>
            {team.slug === activeTeam.slug ? (
              <CheckIcon className="size-4" />
            ) : (
              <kbd className={kbdClass}>{`⌘${i + 1}`}</kbd>
            )}
          </MenuItem>
        ))}
      </MenuGroup>
      <MenuSeparator />
      <MenuGroup>
        <MenuItem className={`${itemClass} justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className="flex size-6 items-center justify-center">
              <GearSixIcon className="size-4" />
            </div>
            <span>Team settings</span>
          </div>
        </MenuItem>
        <MenuItem className={`${itemClass} justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className="flex size-6 items-center justify-center">
              <PlusIcon className="size-4" />
            </div>
            <span>Create team</span>
          </div>
          <kbd className={kbdClass}>⌘T</kbd>
        </MenuItem>
      </MenuGroup>
    </MenuPopup>
  );
}

function AccountDropdown() {
  const { theme, setTheme } = useTheme();

  return (
    <MenuPopup align="end" sideOffset={6} className="w-60">
      <div className="px-3 py-2.5">
        <p className="font-medium text-sm">{user.name}</p>
        <p className="text-muted-foreground text-sm">{user.email}</p>
      </div>
      <MenuSeparator />
      <MenuGroup>
        <MenuItem className={itemClass}>
          <KeyIcon className="size-4" />
          <span>API keys</span>
        </MenuItem>
        <MenuItem className={itemClass}>
          <GearSixIcon className="size-4" />
          <span>Settings</span>
        </MenuItem>
      </MenuGroup>
      <MenuSeparator />
      <MenuSub>
        <MenuSubTrigger className={itemClass}>
          <SunIcon className="size-4" />
          <span>Theme</span>
        </MenuSubTrigger>
        <MenuSubPopup className="w-40">
          <MenuRadioGroup value={theme} onValueChange={setTheme}>
            <MenuRadioItem value="light" className={itemClass}>
              Light
            </MenuRadioItem>
            <MenuRadioItem value="dark" className={itemClass}>
              Dark
            </MenuRadioItem>
            <MenuRadioItem value="system" className={itemClass}>
              System
            </MenuRadioItem>
          </MenuRadioGroup>
        </MenuSubPopup>
      </MenuSub>
      <MenuSeparator />
      <MenuItem className={`${itemClass} text-destructive-foreground`}>
        <SignOutIcon className="size-4" />
        <span>Log out</span>
      </MenuItem>
    </MenuPopup>
  );
}
