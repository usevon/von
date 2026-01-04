"use client";

import { Databuddy } from "@databuddy/sdk/react";

type AnalyticsProps = {
  clientId: string;
  disabled?: boolean;
};

export const Analytics = (props: AnalyticsProps) => {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <Databuddy
      clientId={props.clientId}
      disabled={props.disabled ?? isDev}
      trackPerformance
      trackWebVitals
      trackErrors
      trackInteractions
      trackScrollDepth
    />
  );
};
