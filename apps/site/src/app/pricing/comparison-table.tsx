import { CheckIcon, InfoIcon, MinusIcon } from "@phosphor-icons/react/ssr";
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@usevon/ui";

const comparisonFeatures = [
  {
    category: "Usage",
    features: [
      {
        name: "Webhooks/month",
        description:
          "Number of webhook deliveries included in your plan each month.",
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
    category: "Infrastructure",
    features: [
      {
        name: "Dev tunnels",
        description: "One concurrent tunnel per team member.",
        hobby: "1",
        pro: "1 per member",
      },
      {
        name: "Retention",
        description: "How long webhook delivery logs are stored.",
        hobby: "3 days",
        pro: "90 days",
      },
      {
        name: "Custom domains",
        description: "Use your own domain for webhook endpoints.",
        hobby: true,
        pro: true,
      },
      {
        name: "Dedicated IP",
        description: "Static IP address for customer IP allowlists.",
        hobby: false,
        pro: "+$50/mo per IP",
      },
    ],
  },
  {
    category: "Team & Support",
    features: [
      {
        name: "Team members",
        description: "Users who can access your Von workspace.",
        hobby: "1",
        pro: "5 included",
      },
      {
        name: "Additional members",
        description: "Cost for each team member beyond the included amount.",
        hobby: false,
        pro: "$5/mo each",
      },
      {
        name: "Support",
        description: "How you can reach us for help.",
        hobby: "Discord",
        pro: "Discord + Email",
      },
    ],
  },
];

type FeatureTooltipProps = {
  name: string;
  description: string;
};

const FeatureTooltip = (props: FeatureTooltipProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger className="inline-flex items-center gap-1.5 text-left">
        {props.name}
        <InfoIcon className="size-4 text-muted-foreground/50 transition-colors hover:text-muted-foreground" />
      </TooltipTrigger>
      <TooltipPopup className="whitespace-nowrap">
        {props.description}
      </TooltipPopup>
    </Tooltip>
  </TooltipProvider>
);

const renderFeatureValue = (value: boolean | string) => {
  if (value === true) {
    return (
      <CheckIcon className="mx-auto size-5 text-foreground" weight="bold" />
    );
  }
  if (value === false) {
    return <MinusIcon className="mx-auto size-5 text-muted-foreground/40" />;
  }
  return value;
};

export const ComparisonTable = () => {
  return (
    <>
      {/* Desktop table */}
      <table className="w-full border-collapse text-left text-sm max-sm:hidden">
        <colgroup>
          <col className="w-[50%]" />
          <col className="w-[25%]" />
          <col className="w-[25%]" />
        </colgroup>
        <thead className="sticky top-[5.25rem] z-10 bg-background shadow-[inset_0_-1px_0_var(--color-border)]">
          <tr>
            <th className="pr-3 pb-4 font-medium text-base text-foreground">
              Compare features
            </th>
            <th className="pb-4 text-center font-semibold text-foreground">
              Hobby
            </th>
            <th className="pb-4 text-center font-semibold text-foreground">
              Pro
            </th>
          </tr>
        </thead>
        {comparisonFeatures.map((group) => (
          <tbody key={group.category}>
            <tr>
              <th
                className="border-border border-t border-b pt-8 pb-4 font-medium text-foreground"
                colSpan={3}
              >
                {group.category}
              </th>
            </tr>
            {group.features.map((feature) => (
              <tr className="border-border/50 border-b" key={feature.name}>
                <th className="py-3 pr-3 font-normal text-muted-foreground">
                  <FeatureTooltip
                    description={feature.description}
                    name={feature.name}
                  />
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
        <h2 className="font-semibold text-lg">Compare features</h2>
        {comparisonFeatures.map((group) => (
          <div key={group.category}>
            <h3 className="font-medium text-foreground">{group.category}</h3>
            <div className="mt-4 space-y-4">
              {group.features.map((feature) => (
                <div className="text-sm" key={feature.name}>
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
