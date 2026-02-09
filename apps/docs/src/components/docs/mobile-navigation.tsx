"use client";

import { ListIcon } from "@phosphor-icons/react";
import {
  Button,
  Sheet,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@usevon/ui";

import { Navigation } from "./navigation";

export const MobileNavigation = () => (
  <Sheet>
    <SheetTrigger
      render={<Button className="lg:hidden" size="icon" variant="ghost" />}
    >
      <ListIcon className="size-4" />
    </SheetTrigger>
    <SheetPopup
      className="w-80 bg-[color-mix(in_srgb,var(--color-background),var(--color-foreground)_2%)] dark:bg-[color-mix(in_srgb,var(--color-background),white_2%)]"
      side="left"
    >
      <SheetHeader>
        <SheetTitle>Documentation</SheetTitle>
      </SheetHeader>
      <SheetPanel>
        <Navigation />
      </SheetPanel>
    </SheetPopup>
  </Sheet>
);
