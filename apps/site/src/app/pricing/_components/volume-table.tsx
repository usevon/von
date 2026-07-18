import {
  fmt,
  fmtCurrency,
  getCheapestPlan,
  PAYLOAD_BLOCK_KB,
} from "@/lib/calculator";

const VOLUMES = [
  25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000,
  10_000_000, 25_000_000,
];

type RowProps = {
  messages: number;
};

const VolumeRow = (props: RowProps) => {
  const estimate = getCheapestPlan(props.messages);

  return (
    <div className="grid grid-cols-3 border-border/50 border-t text-sm">
      <div className="px-8 py-3 tabular-nums">{fmt.format(props.messages)}</div>
      <div className="border-border/50 border-l px-8 py-3">
        {estimate.plan.name}
      </div>
      <div className="border-border/50 border-l px-8 py-3 tabular-nums">
        {fmtCurrency.format(estimate.total)}
        <span className="text-muted-foreground">/mo</span>
        {estimate.overage > 0 && (
          <span className="text-muted-foreground">
            {" "}
            (incl. {fmtCurrency.format(estimate.overage)} overage)
          </span>
        )}
      </div>
    </div>
  );
};

export const VolumeTable = () => (
  <section className="mt-24 px-8 sm:px-12">
    <div className="mb-8 flex flex-col gap-4">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
        What you would pay
      </p>
      <h2 className="max-w-[28ch] font-semibold text-3xl tracking-tight sm:text-4xl">
        Find your volume{" "}
        <span className="text-foreground/50">and read across.</span>
      </h2>
    </div>

    <div className="border-border border-b">
      <div className="grid grid-cols-3 border-border border-y font-semibold text-sm">
        <div className="px-8 py-3">Messages/month</div>
        <div className="border-border border-l px-8 py-3">Plan</div>
        <div className="border-border border-l px-8 py-3">Monthly cost</div>
      </div>
      {VOLUMES.map((messages) => (
        <VolumeRow key={messages} messages={messages} />
      ))}
    </div>

    <ul className="mt-6 space-y-2 text-muted-foreground text-sm">
      <li>
        Retries are free and never counted. You only pay for the first delivery
        attempt of each message.
      </li>
      <li>
        Payloads over {PAYLOAD_BLOCK_KB} KB count as one additional message per{" "}
        {PAYLOAD_BLOCK_KB} KB.
      </li>
      <li>
        The plan shown is the cheapest fit for that volume. Higher tiers also
        raise throughput and retention.
      </li>
    </ul>
  </section>
);
