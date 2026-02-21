"use client";

import { useState } from "react";

import {
  CUSTOM_DOMAIN_ADDON,
  getEffectiveRate,
  getGraduatedCost,
  getRetentionAddon,
  getThroughputAddon,
  INCLUDED_TEAM_MEMBERS,
  MIN_PAYG_MONTHLY,
  RETENTION_MIN,
  TEAM_MEMBER_ADDON,
  TEAM_MEMBERS_MIN,
  THROUGHPUT_MIN,
  WEBHOOK_MIN,
} from "@/lib/calculator";

export type CalculatorState = ReturnType<typeof useCalculatorState>;

export function useCalculatorState() {
  const [monthlyWebhooks, setMonthlyWebhooks] = useState(WEBHOOK_MIN);
  const [throughputEnabled, setThroughputEnabled] = useState(false);
  const [throughputPerSecond, setThroughputPerSecond] =
    useState(THROUGHPUT_MIN);
  const [retentionEnabled, setRetentionEnabled] = useState(false);
  const [retentionDays, setRetentionDays] = useState(RETENTION_MIN);
  const [customDomainsEnabled, setCustomDomainsEnabled] = useState(false);
  const [teamMembersEnabled, setTeamMembersEnabled] = useState(false);
  const [teamMembers, setTeamMembers] = useState(TEAM_MEMBERS_MIN);

  const usageCost = getGraduatedCost(monthlyWebhooks);
  const effectiveRate = getEffectiveRate(monthlyWebhooks);
  const throughputAddon = throughputEnabled
    ? getThroughputAddon(throughputPerSecond)
    : 0;
  const retentionAddon = retentionEnabled
    ? getRetentionAddon(retentionDays, monthlyWebhooks)
    : 0;
  const customDomainsAddon = customDomainsEnabled ? CUSTOM_DOMAIN_ADDON : 0;
  const teamMemberAddon = teamMembersEnabled
    ? Math.max(0, teamMembers - INCLUDED_TEAM_MEMBERS) * TEAM_MEMBER_ADDON
    : 0;
  const addons =
    throughputAddon + retentionAddon + customDomainsAddon + teamMemberAddon;
  const billedTotal = Math.max(MIN_PAYG_MONTHLY, usageCost + addons);

  return {
    monthlyWebhooks,
    setMonthlyWebhooks,
    throughputEnabled,
    setThroughputEnabled,
    throughputPerSecond,
    setThroughputPerSecond,
    retentionEnabled,
    setRetentionEnabled,
    retentionDays,
    setRetentionDays,
    customDomainsEnabled,
    setCustomDomainsEnabled,
    teamMembersEnabled,
    setTeamMembersEnabled,
    teamMembers,
    setTeamMembers,
    usageCost,
    effectiveRate,
    addons,
    throughputAddon,
    retentionAddon,
    customDomainsAddon,
    teamMemberAddon,
    billedTotal,
    burstCapacity: Math.floor(
      (throughputEnabled ? throughputPerSecond : THROUGHPUT_MIN) * 1.4
    ),
  };
}
