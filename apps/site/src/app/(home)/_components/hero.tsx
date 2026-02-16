import { Button } from "@usevon/ui";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { docsUrl, urls } from "@/lib/urls";

const gridCells = [
  [0, 0, 0, 35],
  [0, 0, 35, 0],
  [0, 35, 0, 0],
] as const;

function HeroGrid() {
  return (
    <div
      className="mask-intersect mask-[linear-gradient(150deg,transparent_0%,transparent_25%,black_70%),linear-gradient(330deg,transparent_0%,transparent_25%,black_70%)] absolute right-0 bottom-0 left-[40%] grid sm:left-[50%] lg:left-[calc(60%-1px)]"
      style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
    >
      {gridCells.flatMap((row, ri) =>
        row.map((fill, ci) => {
          const isLastRow = ri === gridCells.length - 1;
          const isLastCol = ci === 3;
          return (
            <div
              className={cn(
                "aspect-square border-border",
                ci === 0 && "border-l",
                !isLastCol && "border-r",
                !isLastRow && "border-b",
              )}
              key={`${ri}-${ci}`}
              style={
                fill
                  ? {
                    backgroundColor: `color-mix(in srgb, var(--wallpaper-4) ${fill}%, transparent)`,
                    }
                  : undefined
              }
            />
          );
        }),
      )}
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <HeroGrid />
      <div className="relative z-10 flex flex-col gap-8 px-8 py-12 sm:px-12 sm:py-16">
        <h1 className="font-semibold text-5xl tracking-tight sm:text-7xl">
          <span className="block">Webhooks infrastructure</span>
          <span className="block">that just works.</span>
        </h1>
        <p className="max-w-[56ch] text-[1.0625rem]/[2rem] text-muted-foreground">
          Reliable webhook delivery with automatic retries, circuit
          breakers, and real-time monitoring so you can focus on building
          your product.
        </p>
        <div className="flex flex-wrap gap-4">
          <Button
            render={<Link href={urls.signup} />}
            size="xl"
          >
            Get Started
          </Button>
          <Button
            render={<Link href={docsUrl()} />}
            size="xl"
            variant="outline"
          >
            Docs
          </Button>
        </div>
      </div>
    </section>
  );
}
