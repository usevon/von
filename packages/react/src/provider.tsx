import { getBearerToken } from "@usevon/auth/client";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo } from "react";

type Credentials = { type: "bearer"; token: string } | { type: "cookie" };

type VonContextValue = {
  apiUrl: string;
  getCredentials: () => Promise<Credentials>;
};

const VonContext = createContext<VonContextValue | null>(null);

type VonProviderProps = {
  children: ReactNode;
  apiUrl?: string;
  apiKey?: string;
  useSession?: boolean;
};

export const VonProvider = (props: VonProviderProps) => {
  const getCredentials = useCallback(async (): Promise<Credentials> => {
    if (props.apiKey) {
      return { type: "bearer", token: props.apiKey };
    }
    if (props.useSession) {
      return { type: "cookie" };
    }
    const token = await getBearerToken();
    if (token) {
      return { type: "bearer", token };
    }
    return { type: "cookie" };
  }, [props.apiKey, props.useSession]);

  const value = useMemo(
    () => ({
      apiUrl: props.apiUrl ?? "/api",
      getCredentials,
    }),
    [props.apiUrl, getCredentials]
  );

  return (
    <VonContext.Provider value={value}>
      {props.children}
    </VonContext.Provider>
  );
};

export const useVonContext = () => {
  const context = useContext(VonContext);
  if (!context) {
    throw new Error("useVonContext must be used within VonProvider");
  }
  return context;
};

export type { Credentials, VonContextValue, VonProviderProps };
