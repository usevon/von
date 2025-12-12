import { hashSha256 } from "./crypto"

export function generateId(): string {
  return crypto.randomUUID()
}

export function generateSecret(prefix = "whsec"): string {
  return `${prefix}_${generateId()}`
}

export function generateTunnelId(orgId: string, userId: string, port: number): string {
  return hashSha256(`${orgId}:${userId}:${port}`).slice(0, 12)
}
