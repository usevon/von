import { t } from "elysia"
import type { TunnelResponse } from "@usevon/tunnel"

export type PendingRequest = {
  resolve: (res: TunnelResponse) => void
  reject: (err: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

export type TunnelConnection = {
  send: (data: string) => void
  close: () => void
  pending: Map<string, PendingRequest>
  headers: Record<string, string>
  validationInterval?: ReturnType<typeof setInterval>
  organizationId: string
}

export namespace TunnelModel {
  export const registerBody = t.Object({
    port: t.Number({ minimum: 1, maximum: 65535 }),
  })

  export type registerBody = typeof registerBody.static

  export const registerResponse = t.Object({
    tunnelId: t.String(),
  })

  export type registerResponse = typeof registerResponse.static
}
