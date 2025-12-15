import { hashSha256, randomHex } from "@/crypto"

export function generateId(): string {
  return crypto.randomUUID()
}

export function generateSecret(prefix = "whsec"): string {
  return `${prefix}_${generateId()}`
}

export function generateTunnelId(orgId: string, userId: string, port: number): string {
  return hashSha256(`${orgId}:${userId}:${port}`).slice(0, 12)
}

export function generateTunnelSecret(): string {
  return randomHex(4)
}
