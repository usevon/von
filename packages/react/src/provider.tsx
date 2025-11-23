import React, { createContext, useContext } from 'react';
import { VonSDK } from '@usevon/sdk';

type VonContextType = {
  sdk: VonSDK;
};

const VonContext = createContext<VonContextType | null>(null);

type VonProviderProps = {
  children: React.ReactNode;
  apiUrl?: string;
  apiKey?: string;
};

export const VonProvider = (props: VonProviderProps) => {
  const sdk = new VonSDK({
    apiUrl: props.apiUrl,
    apiKey: props.apiKey,
  });

  return (
    <VonContext.Provider value={{ sdk }}>
      {props.children}
    </VonContext.Provider>
  );
};

export const useVon = () => {
  const context = useContext(VonContext);
  if (!context) {
    throw new Error('useVon must be used within VonProvider');
  }
  return context.sdk;
};
