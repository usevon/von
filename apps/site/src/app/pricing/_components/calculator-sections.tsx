"use client";

import { Switch } from "@usevon/ui";
import {
  fmt,
  fmtCurrency,
  formatCompact,
  RETENTION_MAX,
  RETENTION_MIN,
  RETENTION_RATE,
  RETENTION_TICKS,
  TEAM_MEMBER_ADDON,
  TEAM_MEMBERS_MAX,
  TEAM_MEMBERS_MIN,
  TEAM_MEMBERS_TICKS,
  THROUGHPUT_MAX,
  THROUGHPUT_MIN,
  THROUGHPUT_TICKS,
  WEBHOOK_MAX,
  WEBHOOK_MIN,
  WEBHOOK_TICKS,
} from "@/lib/calculator";
import { cn } from "@/lib/utils";
import { AddOnRow } from "./addon-row";
import { AnimatedCurrency } from "./animated-currency";
import { SliderRow } from "./slider-row";
import type { CalculatorState } from "./use-calculator-state";

const WEBHOOK_OPTS = {
  min: WEBHOOK_MIN,
  max: WEBHOOK_MAX,
  step: 1000,
  ticks: WEBHOOK_TICKS,
  labelForTick: formatCompact,
  tickSkipInterval: 1,
};

const THROUGHPUT_OPTS = {
  min: THROUGHPUT_MIN,
  max: THROUGHPUT_MAX,
  step: 1,
  ticks: THROUGHPUT_TICKS,
  labelForTick: (t: number) => `${t}`,
  tickSkipInterval: 1,
};

const RETENTION_OPTS = {
  min: RETENTION_MIN,
  max: RETENTION_MAX,
  step: 1,
  ticks: RETENTION_TICKS,
  labelForTick: (t: number) => `${t}`,
  tickSkipInterval: 1,
};

const TEAM_MEMBERS_OPTS = {
  min: TEAM_MEMBERS_MIN,
  max: TEAM_MEMBERS_MAX,
  step: 1,
  ticks: TEAM_MEMBERS_TICKS,
  labelForTick: (t: number) => `${t}`,
  tickSkipInterval: 1,
};

export function CalculatorSections({
  state,
  topBorder = true,
}: {
  state: CalculatorState;
  topBorder?: boolean;
}) {
  const {
    monthlyWebhooks,
    setMonthlyWebhooks,
    usageCost,
    effectiveRate,
    throughputEnabled,
    setThroughputEnabled,
    throughputPerSecond,
    setThroughputPerSecond,
    throughputAddon,
    retentionEnabled,
    setRetentionEnabled,
    retentionDays,
    setRetentionDays,
    retentionAddon,
    teamMembersEnabled,
    setTeamMembersEnabled,
    teamMembers,
    setTeamMembers,
    teamMemberAddon,
    customDomainsEnabled,
    setCustomDomainsEnabled,
    customDomainsAddon,
  } = state;

  return (
    <div className={cn(topBorder && "mt-4 border-border border-t pt-4")}>
      <div className="pb-4">
        <SliderRow
          inputSuffix="/mo"
          onValueChange={setMonthlyWebhooks}
          options={WEBHOOK_OPTS}
          title="Events per month"
          value={monthlyWebhooks}
          valueText={
            <span className="flex items-center justify-between">
              <span>
                <span className="font-medium text-foreground">
                  {fmt.format(monthlyWebhooks)} events
                </span>
                <span className="font-normal text-muted-foreground">
                  {" "}
                  ({fmtCurrency.format(effectiveRate)} per 10k)
                </span>
              </span>
              <span className="text-muted-foreground tabular-nums">
                <AnimatedCurrency value={usageCost} />
                /mo
              </span>
            </span>
          }
          valueTextClassName="text-sm"
        />
      </div>

      <AddOnRow
        cost={throughputAddon}
        costSuffix="/mo"
        enabled={throughputEnabled}
        label="Throughput"
        onToggle={setThroughputEnabled}
      >
        <SliderRow
          inputSuffix="/sec"
          onValueChange={setThroughputPerSecond}
          options={THROUGHPUT_OPTS}
          title="Throughput per second"
          value={throughputPerSecond}
          valueText={
            <>
              <span className="font-medium text-foreground">
                {throughputPerSecond}/sec
              </span>
              <span className="font-normal text-muted-foreground">
                {" "}
                ({Math.floor(throughputPerSecond * 1.4)} burst)
              </span>
            </>
          }
          valueTextClassName="text-sm"
        />
      </AddOnRow>

      <AddOnRow
        cost={retentionAddon}
        costSuffix="/mo"
        enabled={retentionEnabled}
        label="Retention"
        onToggle={setRetentionEnabled}
      >
        <SliderRow
          inputSuffix="days"
          onValueChange={setRetentionDays}
          options={RETENTION_OPTS}
          title="Retention window"
          value={retentionDays}
          valueText={
            <>
              <span className="font-medium text-foreground">
                {retentionDays} days
              </span>
              <span className="font-normal text-muted-foreground">
                {" "}
                (+${RETENTION_RATE.toFixed(2)}/10k events per week)
              </span>
            </>
          }
          valueTextClassName="text-sm"
        />
      </AddOnRow>

      <AddOnRow
        cost={teamMemberAddon}
        costSuffix="/mo"
        enabled={teamMembersEnabled}
        label="Team members"
        onToggle={setTeamMembersEnabled}
      >
        <SliderRow
          inputSuffix="total"
          onValueChange={setTeamMembers}
          options={TEAM_MEMBERS_OPTS}
          title="Team members"
          value={teamMembers}
          valueText={
            <>
              <span className="font-medium text-foreground">
                You
                <span className="font-normal text-muted-foreground">
                  {" "}
                  (free)
                </span>{" "}
                + {teamMembers - 1} {teamMembers - 1 === 1 ? "other" : "others"}
              </span>
              <span className="font-normal text-muted-foreground">
                {" "}
                (+{fmtCurrency.format(TEAM_MEMBER_ADDON)}/mo each)
              </span>
            </>
          }
          valueTextClassName="text-sm"
        />
      </AddOnRow>

      <div className="border-border border-t py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Switch
              checked={customDomainsEnabled}
              onCheckedChange={(c) => setCustomDomainsEnabled(Boolean(c))}
            />
            <p className="font-medium text-sm">Custom domains</p>
          </div>
          <p className="text-muted-foreground text-sm tabular-nums">
            +<AnimatedCurrency value={customDomainsAddon} />
            /mo
          </p>
        </div>
      </div>
    </div>
  );
}
