"use client";

import { Button, Sheet, SheetTrigger, SheetPopup, SheetHeader, SheetTitle, SheetPanel } from "@usevon/ui";
import { ListIcon } from "@phosphor-icons/react";

import { Navigation } from "./navigation";

export const MobileNavigation = () => {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" />}>
        <ListIcon className="size-4" />
      </SheetTrigger>
      <SheetPopup side="left" className="w-80 bg-[color-mix(in_srgb,var(--color-background),var(--color-foreground)_2%)] dark:bg-[color-mix(in_srgb,var(--color-background),white_2%)]">
        <SheetHeader>
          <SheetTitle>Documentation</SheetTitle>
        </SheetHeader>
        <SheetPanel>
          <Navigation />
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
};
