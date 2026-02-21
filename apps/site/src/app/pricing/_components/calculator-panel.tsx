"use client";

import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import {
  Collapsible,
  CollapsibleContent,
  Dialog,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@usevon/ui";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { MIN_PAYG_MONTHLY } from "@/lib/calculator";

import { AnimatedCurrency } from "./animated-currency";
import { CalculatorSections } from "./calculator-sections";
import type { CalculatorState } from "./use-calculator-state";

export function CalculatorDialog({ state }: { state: CalculatorState }) {
  const [open, setOpen] = useState(true);
  const total = state.billedTotal;
  const atMinimum = state.usageCost + state.addons <= MIN_PAYG_MONTHLY;

  const addonRows = [
    {
      label: "Members",
      value: state.teamMemberAddon,
      visible: state.teamMemberAddon > 0,
    },
    {
      label: "Throughput",
      value: state.throughputAddon,
      visible: state.throughputAddon > 0,
    },
    {
      label: "Retention",
      value: state.retentionAddon,
      visible: state.retentionAddon > 0,
    },
    {
      label: "Custom domain",
      value: state.customDomainsAddon,
      visible: state.customDomainsAddon > 0,
    },
  ];

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            className="w-full cursor-pointer text-center text-muted-foreground text-sm underline-offset-4 hover:underline"
            type="button"
          />
        }
      >
        Estimate your cost
      </DialogTrigger>
      <DialogPopup className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Estimate your cost</DialogTitle>
        </DialogHeader>
        <DialogPanel className="flex-1 overflow-y-auto">
          <CalculatorSections state={state} topBorder={false} />
        </DialogPanel>
        <div className="shrink-0 border-border border-t bg-card px-6 py-4">
          <Collapsible onOpenChange={setOpen} open={open}>
            <button
              className="flex w-full cursor-pointer items-center justify-between text-sm"
              onClick={() => setOpen((o) => !o)}
              type="button"
            >
              <span className="flex items-center gap-1 font-medium">
                Total
                {open ? (
                  <CaretUpIcon
                    className="size-3 text-muted-foreground"
                    weight="bold"
                  />
                ) : (
                  <CaretDownIcon
                    className="size-3 text-muted-foreground"
                    weight="bold"
                  />
                )}
              </span>
              <span className="font-semibold tabular-nums">
                <AnimatedCurrency value={total} />
                /mo
              </span>
            </button>
            <CollapsibleContent className="overflow-hidden transition-[height] duration-200 ease-in-out data-ending-style:h-0 data-starting-style:h-0">
              <div className="pt-2">
                <div className="flex items-center justify-between py-1 text-sm">
                  <span className="text-muted-foreground">
                    {atMinimum ? "Minimum" : "Events"}
                  </span>
                  <span className="tabular-nums">
                    <AnimatedCurrency
                      value={atMinimum ? MIN_PAYG_MONTHLY : state.usageCost}
                    />
                    /mo
                  </span>
                </div>
                <AnimatePresence initial={false}>
                  {addonRows
                    .filter((r) => r.visible)
                    .map((row) => (
                      <motion.div
                        animate={{ height: "auto", opacity: 1 }}
                        className="overflow-hidden"
                        exit={{ height: 0, opacity: 0 }}
                        initial={{ height: 0, opacity: 0 }}
                        key={row.label}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                      >
                        <div className="flex items-center justify-between py-1 text-sm">
                          <span className="text-muted-foreground">
                            {row.label}
                          </span>
                          <span className="tabular-nums">
                            <AnimatedCurrency value={row.value} />
                            /mo
                          </span>
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DialogPopup>
    </Dialog>
  );
}
