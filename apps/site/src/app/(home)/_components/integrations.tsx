const integrations = [
  "Integration 1",
  "Integration 2",
  "Integration 3",
  "Integration 4",
  "Integration 5",
  "Integration 6",
];

export function Integrations() {
  return (
    <section>
      <div className="flex flex-col gap-4 px-8 pt-24 pb-16 sm:px-12">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
          Integrations
        </p>
        <h2 className="font-semibold text-3xl tracking-tight sm:text-4xl">
          Works with the tools{" "}
          <span className="text-foreground/50">you already use.</span>
        </h2>
      </div>
      <div className="flex flex-wrap items-center gap-6 px-8 pb-24 sm:px-12">
        {integrations.map((name) => (
          <div
            className="flex h-14 w-32 items-center justify-center border border-border font-medium text-muted-foreground text-sm"
            key={name}
          >
            {name}
          </div>
        ))}
      </div>
    </section>
  );
}
