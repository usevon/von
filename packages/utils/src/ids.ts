import { randomUUID } from "node:crypto";
import { hashSha256, randomHex } from "@/crypto";

export function generateSecret(prefix = "whsec"): string {
  return `${prefix}_${randomUUID()}`;
}

export function generateTunnelId(
  orgId: string,
  userId: string,
  port: number
): string {
  return hashSha256(`${orgId}:${userId}:${port}`).slice(0, 12);
}

export function generateTunnelSecret(): string {
  return randomHex(16);
}
