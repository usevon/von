import { createContext, useContext } from "react"
import type { ReactNode } from "react"
import { getBearerToken } from "@von/auth/client"

type VonContextValue = {
  apiUrl: string
  getToken: () => Promise<string | null>
}

const VonContext = createContext<VonContextValue | null>(null)

type VonProviderProps = {
  children: ReactNode
  apiUrl: string
}

export const VonProvider = (props: VonProviderProps) => {
  return (
    <VonContext.Provider
      value={{
        apiUrl: props.apiUrl,
        getToken: async () => getBearerToken(),
      }}
    >
      {props.children}
    </VonContext.Provider>
  )
}

export const useVonContext = () => {
  const context = useContext(VonContext)
  if (!context) {
    throw new Error("useVonContext must be used within VonProvider")
  }
  return context
}
