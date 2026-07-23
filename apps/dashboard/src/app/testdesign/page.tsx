"use client";

import {
  MagnifyingGlassIcon,
  SlidersHorizontalIcon,
} from "@phosphor-icons/react";
import React, { type ReactNode, useState } from "react";
import {
  Badge,
  Button,
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
  Dialog,
  DialogClose,
  DialogFooter,
  DialogPopup,
  DialogTrigger,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Menu,
  MenuCheckboxItem,
  MenuGroup,
  MenuGroupLabel,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
  ScrollArea,
  SparkAreaChart,
  TableCell,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@usevon/ui";

function StatGrid({
  cols,
  items,
  gapSize = "1.5rem",
  children,
}: {
  cols: number;
  items: { label: string; value: string }[];
  gapSize?: string;
  children?: (item: { label: string; value: string }, index: number) => ReactNode;
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
        const isLast = idx === items.length - 1;
        const isOddLastRow = isLast && items.length % cols !== 0;
        const remaining = cols - col;
        return (
          <div
            key={idx}
            style={{
              gridColumn: isOddLastRow ? `${col * 2 + 1} / span ${remaining * 2 - 1}` : col * 2 + 1,
              gridRow: row * 2 + 1,
            }}
          >
            {children ? children(item, idx) : (
              <div>
                <span className="text-muted-foreground text-xs">{item.label}</span>
                <span className="mt-1 block font-semibold text-lg">{item.value}</span>
              </div>
            )}
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

const sparkData = [
  { h: "1", v: 12 }, { h: "2", v: 18 }, { h: "3", v: 15 }, { h: "4", v: 22 },
  { h: "5", v: 28 }, { h: "6", v: 25 }, { h: "7", v: 32 }, { h: "8", v: 30 },
  { h: "9", v: 35 }, { h: "10", v: 38 }, { h: "11", v: 42 }, { h: "12", v: 40 },
];

const kpis = [
  { label: "Total Sent", value: "458", trend: "positive" },
  { label: "Successful", value: "424", trend: "positive" },
  { label: "Failed", value: "29", trend: "negative" },
  { label: "Pending", value: "5", trend: "neutral" },
  { label: "Retry Rate", value: "50%", trend: "negative" },
  { label: "Avg Latency", value: "8.9ms", trend: "positive" },
];

const latencyItems = [
  { label: "P50", value: "1.41 ms" },
  { label: "P90", value: "3.88 ms" },
  { label: "P95", value: "5.99 ms" },
  { label: "P99", value: "43.97 ms" },
];

function KpiCell({ label, value }: { label: string; value: string }) {
  const kpi = kpis.find((k) => k.label === label);
  const color = kpi?.trend === "negative" ? "var(--color-destructive)" : "var(--color-success)";
  return (
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <span className="block truncate text-muted-foreground text-xs">{label}</span>
        <span className="mt-1 block font-semibold text-xl">{value}</span>
      </div>
      <SparkAreaChart
        data={sparkData}
        index="h"
        categories={["v"]}
        colors={[color]}
        className="h-14 w-24 shrink-0 sm:w-28"
      />
    </div>
  );
}

function LatencyCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <span className="block truncate text-muted-foreground text-xs">{label}</span>
        <span className="mt-1 block font-semibold text-lg">{value}</span>
      </div>
      <SparkAreaChart
        data={sparkData}
        index="h"
        categories={["v"]}
        colors={["var(--color-foreground)"]}
        className="h-12 w-20 shrink-0 sm:w-24"
        fill="none"
        tooltipFormatter={(v) => `${v}ms`}
      />
    </div>
  );
}

type EventTiming = {
  queueMs: number;
  ttfbMs: number;
  transferMs: number;
};

type EventRow = {
  id: string;
  timestamp: string;
  status: number;
  latencyMs: number;
  region: string;
  eventType: string;
  endpointUrl: string;
  timing: EventTiming | null;
  attempts: number;
  maxAttempts: number;
  payload: string;
  responseBody: string | null;
};

const regions = [
  "Ashburn, Virginia, USA",
  "San Jose, California, USA",
  "Toronto, Canada",
  "Chicago, Illinois, USA",
  "Mumbai, India",
  "London, United Kingdom",
  "Paris, France",
  "Singapore",
  "Sydney, Australia",
  "Tokyo, Japan",
  "São Paulo, Brazil",
  "Amsterdam, Netherlands",
  "Stockholm, Sweden",
  "Dallas, Texas, USA",
];

const eventTypes = [
  "order:created",
  "order:paid",
  "order:cancelled",
  "invoice.finalized",
  "customer.created",
  "payment_intent.succeeded",
  "charge.refunded",
];

function generateEvents(count: number, offset = 0): EventRow[] {
  const base = new Date("2025-11-21T00:01:47Z");
  return Array.from({ length: count }, (_, i) => {
    const idx = offset + i;
    const failed = idx % 11 === 0;
    const timedOut = idx % 23 === 0 && !failed;

    let latency = 10 + (idx % 300);
    let status = 200;
    let attempts = 1;
    let responseBody: string | null = '{"status":"ok","received":true}';

    if (failed) {
      latency = 800 + (idx % 400);
      status = 500;
      attempts = 4;
      responseBody = `Connection refused: upstream at 10.0.4.${12 + (idx % 20)}:8443`;
    } else if (timedOut) {
      latency = 30_000;
      status = 0;
      attempts = 4;
      responseBody = null;
    }

    return {
      id: `evt-${idx}`,
      timestamp: new Date(base.getTime() - idx * 4200).toISOString(),
      status,
      latencyMs: latency,
      region: regions[idx % regions.length],
      eventType: eventTypes[idx % eventTypes.length],
      endpointUrl: `https://api.example.com/webhooks/${idx % 5}`,
      attempts,
      maxAttempts: 4,
      timing: failed
        ? null
        : {
            queueMs: 1 + (idx % 12),
            ttfbMs: Math.max(1, latency - 5 - (idx % 10)),
            transferMs: 2 + (idx % 8),
          },
      payload: JSON.stringify({ event: eventTypes[idx % eventTypes.length], data: { id: idx } }, null, 2),
      responseBody,
    };
  });
}

const timingPhases = [
  { key: "queueMs" as const, label: "Queue", color: "bg-violet-400" },
  { key: "ttfbMs" as const, label: "Time to First Byte", color: "bg-sky-400" },
  { key: "transferMs" as const, label: "Transfer", color: "bg-emerald-400" },
];

function TimingBar({ timing, failed }: { timing: EventTiming | null; failed: boolean }) {
  if (!timing) {
    return (
      <div className="flex h-4 w-24 items-center">
        <div className={`h-full w-full ${failed ? "bg-red-500/40" : "bg-muted-foreground/20"}`} />
      </div>
    );
  }
  const total = timing.queueMs + timing.ttfbMs + timing.transferMs;
  if (total === 0) { return null; }
  const pct = (v: number) => `${Math.max((v / total) * 100, 1).toFixed(1)}%`;
  return (
    <div className="flex h-4 w-24 overflow-hidden">
      {timingPhases.map((p) => (
        <div
          className={p.color}
          key={p.key}
          style={{ width: pct(timing[p.key]) }}
          title={`${p.label} ${timing[p.key]}ms`}
        />
      ))}
    </div>
  );
}

function TimingBreakdown({ timing, total }: { timing: EventTiming; total: number }) {
  const sum = timing.queueMs + timing.ttfbMs + timing.transferMs;
  const phases = timingPhases.map((p) => ({
    ...p,
    ms: timing[p.key],
    pct: sum > 0 ? (timing[p.key] / sum) * 100 : 0,
  }));

  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden">
        {phases.map((p) => (
          <div className={p.color} key={p.key} style={{ width: `${p.pct.toFixed(1)}%` }} />
        ))}
      </div>
      <div className="flex items-baseline gap-4 text-xs">
        {phases.map((p) => (
          <span className="flex items-baseline gap-1.5" key={p.key}>
            <span className={`inline-block size-2 translate-y-[-1px] rounded-full ${p.color}`} />
            <span className="text-muted-foreground">{p.label}</span>
            <span className="font-mono tabular-nums">{p.ms}ms</span>
          </span>
        ))}
        <span className="ml-auto font-medium font-mono text-xs tabular-nums">{total}ms total</span>
      </div>
    </div>
  );
}

function EventDetailPanel({ event }: { event: EventRow }) {
  const isFailed = event.status === 0 || event.status >= 400;
  const statusLabel = event.status === 0 ? "Timeout" : `HTTP ${event.status}`;

  return (
    <div className="space-y-4 bg-accent/30 px-4 py-3 text-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">Event Type</span>
          <p className="font-mono text-xs">{event.eventType}</p>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">Endpoint</span>
          <p className="truncate font-mono text-xs">{event.endpointUrl}</p>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">Attempts</span>
          <p className="text-xs">
            {event.attempts}<span className="text-muted-foreground">/{event.maxAttempts}</span>
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">Response</span>
          <p className={`text-xs ${isFailed ? "text-red-400" : ""}`}>{statusLabel}</p>
        </div>
      </div>

      {event.timing ? (
        <div className="space-y-2">
          <span className="text-muted-foreground text-xs">Timing</span>
          <TimingBreakdown timing={event.timing} total={event.latencyMs} />
        </div>
      ) : (
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">Timing</span>
          <p className="text-red-400 text-xs">
            {event.status === 0
              ? `Request timed out after ${(event.latencyMs / 1000).toFixed(0)}s`
              : `Failed after ${event.latencyMs}ms`}
          </p>
        </div>
      )}

      {event.responseBody ? (
        <div className="space-y-1">
          <span className="text-muted-foreground text-xs">
            {isFailed ? "Error Response" : "Response Body"}
          </span>
          {isFailed ? (
            <p className="font-mono text-red-400 text-xs">{event.responseBody}</p>
          ) : (
            <pre className="max-h-24 overflow-auto border border-border bg-background p-2 font-mono text-xs">
              {(() => { try { return JSON.stringify(JSON.parse(event.responseBody), null, 2); } catch { return event.responseBody; } })()}
            </pre>
          )}
        </div>
      ) : null}

      <div className="space-y-1">
        <span className="text-muted-foreground text-xs">Payload</span>
        <pre className="max-h-32 overflow-auto border border-border bg-background p-2 font-mono text-xs">{event.payload}</pre>
      </div>
    </div>
  );
}

const columns = [
  { key: "timestamp", label: "Timestamp" },
  { key: "eventType", label: "Event Type" },
  { key: "status", label: "Status" },
  { key: "latency", label: "Latency" },
  { key: "region", label: "Region" },
  { key: "timing", label: "Timing" },
] as const;

function EventsTab() {
  const [events] = useState<EventRow[]>(() => generateEvents(30));
  const [search, setSearch] = useState("");
  const [timeRange, setTimeRange] = useState("7d");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibleCols, setVisibleCols] = useState(new Set(columns.map((c) => c.key)));

  type ColKey = (typeof columns)[number]["key"];
  const toggleCol = (key: ColKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };
  const isCol = (key: ColKey) => visibleCols.has(key);

  const filtered = search
    ? events.filter(
        (e) =>
          e.eventType.includes(search) ||
          e.region.toLowerCase().includes(search.toLowerCase()) ||
          String(e.status).includes(search)
      )
    : events;

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) +
      " " +
      d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 p-4 pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex">
            {(["24h", "7d", "30d", "90d"] as const).map((range) => (
              <button
                className={`not-first:-ml-px h-8 border border-border px-3 text-xs outline-none ring-ring/24 transition-[color,background-color,box-shadow] focus-visible:z-10 focus-visible:border-ring focus-visible:ring-[3px] ${timeRange === range ? "bg-accent font-medium text-foreground" : "bg-background text-muted-foreground hover:bg-accent/50"}`}
                key={range}
                onClick={() => setTimeRange(range)}
                type="button"
              >
                {range}
              </button>
            ))}
          </div>
          <Menu>
            <MenuTrigger
              className="inline-flex h-8 items-center gap-1.5 border border-border bg-background px-3 text-muted-foreground text-xs outline-none ring-ring/24 transition-[color,background-color,box-shadow] hover:bg-accent hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px]"
              render={<button type="button" />}
            >
              {`Status: ${statusFilter === "all" ? "All" : statusFilter}`}
            </MenuTrigger>
            <MenuPopup align="start" sideOffset={4}>
              <MenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                <MenuRadioItem value="all">All statuses</MenuRadioItem>
                <MenuRadioItem value="delivered">Delivered</MenuRadioItem>
                <MenuRadioItem value="failed">Failed</MenuRadioItem>
                <MenuRadioItem value="pending">Pending</MenuRadioItem>
              </MenuRadioGroup>
            </MenuPopup>
          </Menu>
          <InputGroup className="w-56">
            <InputGroupAddon align="inline-start">
              <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        </div>
        <Menu>
          <MenuTrigger
            className="inline-flex h-8 items-center gap-1.5 border border-border bg-background px-3 text-muted-foreground text-xs outline-none ring-ring/24 transition-[color,background-color,box-shadow] hover:bg-accent hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px]"
            render={<button type="button" />}
          >
            <SlidersHorizontalIcon className="size-3.5" />
            View ({visibleCols.size})
          </MenuTrigger>
          <MenuPopup align="end" sideOffset={4}>
            <MenuGroup>
              <MenuGroupLabel>Toggle columns</MenuGroupLabel>
              {columns.map((col) => (
                <MenuCheckboxItem
                  checked={isCol(col.key)}
                  className="select-none"
                  key={col.key}
                  onCheckedChange={() => toggleCol(col.key)}
                >
                  {col.label}
                </MenuCheckboxItem>
              ))}
            </MenuGroup>
          </MenuPopup>
        </Menu>
      </div>
      </div>

      <ScrollArea scrollFade className="min-h-0 flex-1 px-4 pb-4">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-10" />
          <col className="w-50" />
          <col className="w-20" />
          <col className="w-22.5" />
          <col />
          <col className="w-30" />
        </colgroup>
        <thead className="select-none">
          <tr>
            <th className="h-10 whitespace-nowrap px-2 pr-0 pl-4 text-left align-middle font-medium text-muted-foreground" />
            <th className="h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-muted-foreground">Timestamp</th>
            <th className="h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-muted-foreground">Status</th>
            <th className="h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-muted-foreground">Latency</th>
            <th className="h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-muted-foreground">Region</th>
            <th className="h-10 whitespace-nowrap px-2 text-right align-middle font-medium text-muted-foreground">Timing</th>
          </tr>
        </thead>
          {filtered.map((event) => (
            <Collapsible key={event.id} render={<tbody />}>
              <CollapsibleTrigger nativeButton={false} render={
                <tr className="cursor-pointer border-border border-b outline-none transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 data-[open]:border-b-0 data-[open]:bg-accent/30" />
              }>
                <TableCell className="py-2.5 pr-0 pl-4">
                  <span className={`inline-block size-2.5 ${event.status < 400 ? "bg-emerald-500" : "bg-red-500"}`} />
                </TableCell>
                <TableCell className="py-2.5">
                  <span className="font-mono text-xs">{fmt(event.timestamp)}</span>
                </TableCell>
                <TableCell className="py-2.5">
                  <Badge size="sm" variant={event.status < 400 ? "success" : "destructive"}>
                    {event.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-2.5">
                  <span className="font-mono text-xs">
                    <span className={event.latencyMs > 500 ? "text-red-400" : "text-foreground"}>{event.latencyMs}</span>
                    <span className="text-muted-foreground">ms</span>
                  </span>
                </TableCell>
                <TableCell className="py-2.5">
                  <span className="text-sm">{event.region}</span>
                </TableCell>
                <TableCell className="py-2.5 text-right">
                  <div className="flex justify-end">
                    <TimingBar timing={event.timing} failed={event.status === 0 || event.status >= 400} />
                  </div>
                </TableCell>
              </CollapsibleTrigger>
              <tr>
                <td className="p-0" colSpan={6}>
                  <CollapsiblePanel>
                    <div className="border-border border-b">
                      <EventDetailPanel event={event} />
                    </div>
                  </CollapsiblePanel>
                </td>
              </tr>
            </Collapsible>
          ))}
      </table>
      </ScrollArea>
    </div>
  );
}

const recentQueue = [
  { status: 200, event: "order:created", url: "https://...example.com" },
  { status: 500, event: "order:cancelled:product", url: "https://...example.com" },
  { status: 200, event: "order:paid:product", url: "https://...example.com" },
  { status: 200, event: "order:updated", url: "https://...example.com" },
  { status: 200, event: "order:partial", url: "https://...example.com" },
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

function QueueRow({ item, last }: { item: (typeof recentQueue)[number]; last?: boolean }) {
  return (
    <div className={`grid grid-cols-[5.5rem_1fr_10rem] items-center gap-x-4 py-2.5 transition-colors hover:bg-accent/50 ${last ? "" : "border-border border-b"}`}>
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
    <div className="grid grid-cols-[5.5rem_1fr_10rem] items-center gap-x-4 border-border border-b py-2 text-muted-foreground text-xs">
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
      <p className="mt-0.5 text-muted-foreground text-xs">Latest webhook deliveries and their status</p>
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
            <div className="space-y-2 border-border border-b p-4">
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
            <div className="px-4 pt-4">
              <QueueHeader />
            </div>
            <ScrollArea scrollFade className="max-h-80 px-4 pb-4">
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
      <div className="space-y-2 border-border border-b p-4">
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
      <ScrollArea scrollFade className="max-h-96 px-4 py-4">
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
      <p className="mt-0.5 text-muted-foreground text-xs">Most frequently triggered event types</p>
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

function ScrollablePanel({
  children,
  value,
}: {
  children: React.ReactNode;
  value: string;
}) {
  return (
    <TabsPanel className="min-h-0 flex-1" value={value}>
      <ScrollArea scrollFade className="h-full">
        <div className="p-4">{children}</div>
      </ScrollArea>
    </TabsPanel>
  );
}

export default function TestDesignPage() {
  return (
    <div className="flex h-svh flex-col overflow-hidden bg-muted">
      <header className="flex h-14 shrink-0 items-center justify-between px-4">
        <div className="h-8 w-32 bg-muted-foreground/30" />
        <div className="size-8 rounded-full bg-muted-foreground/30" />
      </header>

      <div className="mx-2 flex flex-1 flex-col overflow-hidden rounded-t-xl border-border border-t border-r border-l bg-background">
        <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="overview">
          <div className="shrink-0 p-4 pb-0">
            <div>
              <div className="h-8 w-48 bg-muted-foreground/20" />
              <div className="mt-2 h-4 w-64 bg-muted-foreground/15" />
            </div>
            <div className="mt-4">
              <TabsList variant="underline">
                <TabsTab value="overview">Overview</TabsTab>
                <TabsTab value="events">Events</TabsTab>
                <TabsTab value="logs">Logs</TabsTab>
                <TabsTab value="settings">Settings</TabsTab>
              </TabsList>
            </div>
          </div>

          <ScrollablePanel value="overview">
            <div className="border-border border-b pb-4">
              <div className="sm:hidden">
                <StatGrid cols={2} items={kpis}>
                  {(item) => <KpiCell {...item} />}
                </StatGrid>
              </div>
              <div className="hidden sm:block xl:hidden">
                <StatGrid cols={3} items={kpis}>
                  {(item) => <KpiCell {...item} />}
                </StatGrid>
              </div>
              <div className="hidden xl:block">
                <StatGrid cols={6} items={kpis}>
                  {(item) => <KpiCell {...item} />}
                </StatGrid>
              </div>
            </div>

            <div className="grid grid-cols-1 pt-4 md:grid-cols-[3fr_2fr]">
              <div className="min-w-0 space-y-4 pb-4 md:border-border md:border-r md:pr-4">
                <div>
                  <h3 className="font-medium text-sm">Hourly Activity</h3>
                  <p className="mt-0.5 text-muted-foreground text-xs">Webhook events sent per hour over the last 24 hours</p>
                  <div className="mt-2 flex gap-2">
                    <div className="flex h-64 flex-col justify-between text-[10px] text-muted-foreground">
                      <span>40</span><span>30</span><span>20</span><span>10</span><span>0</span>
                    </div>
                    <div className="flex-1">
                      <div className="h-64 bg-red-500" />
                      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                        <span>12 AM</span><span>3 AM</span><span>6 AM</span><span>9 AM</span><span>12 PM</span><span>3 PM</span><span>6 PM</span><span>9 PM</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-border border-t" />
                <div>
                  <h3 className="font-medium text-sm">Latency</h3>
                  <p className="mt-0.5 text-muted-foreground text-xs">Delivery response time percentiles</p>
                  <div className="mt-2">
                    <div className="xl:hidden">
                      <StatGrid cols={2} items={latencyItems} gapSize="1.5rem">
                        {(item) => <LatencyCell {...item} />}
                      </StatGrid>
                    </div>
                    <div className="hidden xl:block">
                      <StatGrid cols={4} items={latencyItems} gapSize="1.5rem">
                        {(item) => <LatencyCell {...item} />}
                      </StatGrid>
                    </div>
                  </div>
                </div>
                <div className="border-border border-t" />
                <div>
                  <h3 className="font-medium text-sm">Delivery Response Time</h3>
                  <p className="mt-0.5 text-muted-foreground text-xs">Webhook delivery response time across all endpoints</p>
                  <div className="mt-2 flex gap-2">
                    <div className="flex h-48 flex-col justify-between text-[10px] text-muted-foreground">
                      <span>500ms</span><span>300ms</span><span>150ms</span><span>50ms</span><span>0ms</span>
                    </div>
                    <div className="flex-1">
                      <div className="h-48 bg-amber-400/80" />
                      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                        <span>12 AM</span><span>3 AM</span><span>6 AM</span><span>9 AM</span><span>12 PM</span><span>3 PM</span><span>6 PM</span><span>9 PM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="min-w-0 space-y-4 border-border border-t pt-4 md:border-t-0 md:pt-0 md:pl-4">
                <RecentQueue />
                <div className="border-border border-t" />
                <TopEvents />
              </div>
            </div>
          </ScrollablePanel>

          <TabsPanel className="min-h-0 flex-1" value="events">
            <EventsTab />
          </TabsPanel>

          <ScrollablePanel value="logs">
            <p className="text-muted-foreground text-sm">Logs tab content</p>
          </ScrollablePanel>

          <ScrollablePanel value="settings">
            <p className="text-muted-foreground text-sm">Settings tab content</p>
          </ScrollablePanel>
        </Tabs>
      </div>
    </div>
  );
}
