"use client";

import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useState } from "react";
import {
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
  ScrollArea,
  SparkAreaChart,
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
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="mt-1 block text-lg font-semibold">{item.value}</span>
              </div>
            )}
          </div>
        );
      })}
      {Array.from({ length: cols - 1 }, (_, ci) =>
        Array.from({ length: rows }, (_, ri) => (
          <div
            key={`v${ci}${ri}`}
            className="flex justify-center"
            style={{ gridColumn: (ci + 1) * 2, gridRow: ri * 2 + 1 }}
          >
            <div className="h-full border-l border-border" />
          </div>
        ))
      )}
      {Array.from({ length: rows - 1 }, (_, ri) =>
        Array.from({ length: cols }, (_, ci) => (
          <div
            key={`h${ri}${ci}`}
            className="flex items-center"
            style={{ gridColumn: ci * 2 + 1, gridRow: (ri + 1) * 2 }}
          >
            <div className="w-full border-t border-border" />
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
        <span className="block truncate text-xs text-muted-foreground">{label}</span>
        <span className="mt-1 block text-xl font-semibold">{value}</span>
      </div>
      <SparkAreaChart
        data={sparkData}
        index="h"
        categories={["v"]}
        colors={[color]}
        className="h-10 w-20 shrink-0 sm:w-24"
      />
    </div>
  );
}

function LatencyCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="mt-1 block text-lg font-semibold">{value}</span>
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
    <div className={`grid grid-cols-[5.5rem_1fr_10rem] items-center gap-x-4 py-2.5 ${last ? "" : "border-b border-border"}`}>
      <Badge variant={item.status < 400 ? "success" : "error"} className="w-fit font-mono text-[11px]">
        {item.status}
      </Badge>
      <span className="text-sm">{item.event}</span>
      <span className="truncate text-right text-xs text-muted-foreground">{item.url}</span>
    </div>
  );
}

function QueueHeader() {
  return (
    <div className="grid grid-cols-[5.5rem_1fr_10rem] items-center gap-x-4 border-b border-border py-2 text-xs text-muted-foreground">
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
      <h3 className="text-sm font-medium">Recent Queue</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Latest webhook deliveries and their status</p>
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
            <div className="space-y-2 border-b border-border p-4">
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
                <p className="py-8 text-center text-sm text-muted-foreground">No results.</p>
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
      <div className="space-y-2 border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl leading-none">{title}</h2>
          <span className="text-xs font-medium uppercase text-muted-foreground">{columnLabels[1]}</span>
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
            <p className="py-8 text-center text-sm text-muted-foreground">No results.</p>
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
      <h3 className="text-sm font-medium">Top Events</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Most frequently triggered event types</p>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
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

export default function TestDesignPage() {
  return (
    <div className="flex min-h-svh flex-col bg-muted">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between px-4">
        <div className="h-8 w-32 bg-zinc-400" />
        <div className="size-8 rounded-full bg-zinc-400" />
      </header>

      {/* Content panel */}
      <div className="mx-2 flex-1 overflow-hidden rounded-t-xl border-t border-l border-r border-border bg-background p-4">
        {/* Page title + subtitle */}
        <div>
          <div className="h-8 w-48 bg-zinc-300" />
          <div className="mt-2 h-4 w-64 bg-zinc-200" />
        </div>

        {/* Tab bar */}
        <div className="mt-4 border-b border-border">
          <div className="flex gap-6 pb-2">
            <div className="h-4 w-20 bg-zinc-400" />
            <div className="h-4 w-20 bg-zinc-200" />
            <div className="h-4 w-14 bg-zinc-200" />
            <div className="h-4 w-28 bg-zinc-200" />
          </div>
        </div>

        <div className="pt-4">
          {/* KPI row */}
          <div className="border-b border-border pb-4">
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

          {/* Two-column body */}
          <div className="grid grid-cols-1 pt-4 md:grid-cols-[3fr_2fr]">
            {/* Left */}
            <div className="min-w-0 space-y-4 pb-4 md:border-r md:border-border md:pr-4">
              {/* Hourly Activity */}
              <div>
                <h3 className="text-sm font-medium">Hourly Activity</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Webhook events sent per hour over the last 24 hours</p>
                <div className="mt-2 flex gap-2">
                  <div className="flex h-64 flex-col justify-between text-[10px] text-muted-foreground">
                    <span>40</span>
                    <span>30</span>
                    <span>20</span>
                    <span>10</span>
                    <span>0</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-64 bg-red-500" />
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                      <span>12 AM</span>
                      <span>3 AM</span>
                      <span>6 AM</span>
                      <span>9 AM</span>
                      <span>12 PM</span>
                      <span>3 PM</span>
                      <span>6 PM</span>
                      <span>9 PM</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Latency Stats */}
              <div>
                <h3 className="text-sm font-medium">Latency</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Delivery response time percentiles</p>
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

              <div className="border-t border-border" />

              {/* Response Time Chart */}
              <div>
                <h3 className="text-sm font-medium">Delivery Response Time</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Webhook delivery response time across all endpoints</p>
                <div className="mt-2 flex gap-2">
                  <div className="flex h-48 flex-col justify-between text-[10px] text-muted-foreground">
                    <span>500ms</span>
                    <span>300ms</span>
                    <span>150ms</span>
                    <span>50ms</span>
                    <span>0ms</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-48 bg-amber-400/80" />
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                      <span>12 AM</span>
                      <span>3 AM</span>
                      <span>6 AM</span>
                      <span>9 AM</span>
                      <span>12 PM</span>
                      <span>3 PM</span>
                      <span>6 PM</span>
                      <span>9 PM</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="min-w-0 space-y-4 border-t border-border pt-4 md:border-t-0 md:pt-0 md:pl-4">
              <RecentQueue />
              <div className="border-t border-border" />
              <TopEvents />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
