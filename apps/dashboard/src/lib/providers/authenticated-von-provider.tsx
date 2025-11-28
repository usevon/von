import type { ReactNode } from "react"
import { VonProvider } from "@usevon/react"
import { useSession } from "@/lib/auth/client"

type AuthenticatedVonProviderProps = {
  children: ReactNode
  apiUrl: string
}

export const AuthenticatedVonProvider = (props: AuthenticatedVonProviderProps) => {
  const { data, isPending } = useSession()
  const { session } = data ?? {}

  const sessionToken = session?.token

  return (
    <VonProvider
      apiUrl={props.apiUrl}
      sessionToken={sessionToken}
      websocket={!isPending && Boolean(sessionToken)}
    >
      {props.children}
    </VonProvider>
  )
}
