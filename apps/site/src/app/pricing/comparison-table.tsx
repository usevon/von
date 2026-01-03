"use client";

import { Check, Minus, Info } from "@phosphor-icons/react";
import { Tooltip, TooltipTrigger, TooltipPopup, TooltipProvider } from "@usevon/ui";

const comparisonFeatures = [
  {
    category: "Usage",
    features: [
      {
        name: "Webhooks/month",
        description: "Number of webhook deliveries included in your plan each month.",
        hobby: "25,000",
        pro: "100,000 included",
      },
      {
        name: "Additional webhooks",
        description: "Cost for webhooks beyond your included amount.",
        hobby: false,
        pro: "$1 per 10k",
      },
      {
        name: "Base throughput",
        description: "Maximum webhooks delivered per second under normal load.",
        hobby: "25/sec",
        pro: "100/sec",
      },
      {
        name: "Burst capacity",
        description: "Temporary throughput boost (1.5x) for traffic spikes.",
        hobby: false,
        pro: "150/sec",
      },
    ],
  },
  {
    category: "Development",
    features: [
      {
        name: "Active dev tunnels",
        description: "Concurrent tunnel connections for local development.",
        hobby: "3",
        pro: "5",
      },
      {
        name: "Tunnel sessions",
        description: "Maximum duration for each tunnel session.",
        hobby: "8 hours",
        pro: "8 hours",
      },
      {
        name: "Real-time events",
        description: "Live event streaming for debugging and monitoring.",
        hobby: true,
        pro: true,
      },
      {
        name: "React components",
        description: "Pre-built React components for webhook management UI.",
        hobby: true,
        pro: true,
      },
    ],
  },
  {
    category: "Infrastructure",
    features: [
      {
        name: "Retention",
        description: "How long webhook delivery logs are stored.",
        hobby: "30 days",
        pro: "90 days",
      },
      {
        name: "Custom domains",
        description: "Use your own domain for webhook endpoints.",
        hobby: false,
        pro: true,
      },
      {
        name: "Dedicated IP",
        description: "Static IP address for customer IP allowlists.",
        hobby: false,
        pro: "+$15/mo per IP",
      },
    ],
  },
  {
    category: "Team & Support",
    features: [
      {
        name: "Team members",
        description: "Users who can access your Von workspace.",
        hobby: "3",
        pro: "Unlimited",
      },
      {
        name: "Support",
        description: "How you can reach us for help.",
        hobby: "Community",
        pro: "Email",
      },
    ],
  },
];

type FeatureTooltipProps = {
  name: string;
  description: string;
};

const FeatureTooltip = (props: FeatureTooltipProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="inline-flex items-center gap-1.5 text-left">
          {props.name}
          <Info className="size-4 text-muted-foreground/50 transition-colors hover:text-muted-foreground" />
        </TooltipTrigger>
        <TooltipPopup className="max-w-xs">{props.description}</TooltipPopup>
      </Tooltip>
    </TooltipProvider>
  );
};

const renderFeatureValue = (value: boolean | string) => {
  if (value === true) {
    return <Check weight="bold" className="mx-auto size-5 text-foreground" />;
  }
  if (value === false) {
    return <Minus className="mx-auto size-5 text-muted-foreground/40" />;
  }
  return value;
};

export const ComparisonTable = () => {
  return (
    <>
      {/* Desktop table */}
      <table className="w-full border-collapse text-left text-sm max-sm:hidden">
        <colgroup>
          <col className="w-1/2" />
          <col className="w-1/4" />
          <col className="w-1/4" />
        </colgroup>
        <thead>
          <tr>
            <th className="sticky top-0 z-10 bg-background pb-4 pr-3 text-base font-medium text-foreground">
              Compare features
            </th>
            <th className="sticky top-0 z-10 bg-background pb-4 text-center font-semibold text-foreground">
              Hobby
            </th>
            <th className="sticky top-0 z-10 bg-background pb-4 text-center font-semibold text-foreground">
              Pro
            </th>
          </tr>
        </thead>
        {comparisonFeatures.map((group) => (
          <tbody key={group.category}>
            <tr>
              <th
                colSpan={3}
                className="border-b border-t border-border pb-4 pt-8 font-medium text-foreground"
              >
                {group.category}
              </th>
            </tr>
            {group.features.map((feature) => (
              <tr key={feature.name} className="border-b border-border/50">
                <th className="py-3 pr-3 font-normal text-muted-foreground">
                  <FeatureTooltip name={feature.name} description={feature.description} />
                </th>
                <td className="py-3 text-center text-muted-foreground">
                  {renderFeatureValue(feature.hobby)}
                </td>
                <td className="py-3 text-center text-muted-foreground">
                  {renderFeatureValue(feature.pro)}
                </td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>

      {/* Mobile comparison */}
      <div className="mt-8 space-y-8 sm:hidden">
        <h2 className="text-lg font-semibold">Compare features</h2>
        {comparisonFeatures.map((group) => (
          <div key={group.category}>
            <h3 className="font-medium text-foreground">{group.category}</h3>
            <div className="mt-4 space-y-4">
              {group.features.map((feature) => (
                <div key={feature.name} className="text-sm">
                  <p className="text-muted-foreground">{feature.name}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground/60">Hobby:</span>{" "}
                      {renderFeatureValue(feature.hobby)}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground/60">Pro:</span>{" "}
                      {renderFeatureValue(feature.pro)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};
