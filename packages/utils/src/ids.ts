import { randomUUID } from "node:crypto";
import { randomHex } from "@/crypto";

export function generateSecret(prefix = "whsec"): string {
  return `${prefix}_${randomUUID()}`;
}

export function generateTunnelSecret(): string {
  return randomHex(16);
}
