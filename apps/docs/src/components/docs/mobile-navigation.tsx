"use client";

import { ListIcon, XIcon } from "@phosphor-icons/react";
import {
  Button,
  Sheet,
  SheetClose,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@usevon/ui";
import Link from "next/link";
import { useState } from "react";
import { appUrl, siteUrl } from "@/lib/urls";
import { Navigation } from "./navigation";

export const MobileNavigation = () => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger
        render={
          <Button className="lg:hidden" size="icon-lg" variant="outline" />
        }
      >
        <ListIcon className="size-4" />
      </SheetTrigger>
      <SheetPopup showCloseButton={false} side="right">
        <div className="flex h-16 items-center justify-between px-8 sm:px-12">
          <SheetTitle>Navigation</SheetTitle>
          <SheetClose render={<Button size="icon" variant="ghost" />}>
            <XIcon />
          </SheetClose>
        </div>
        <SheetPanel className="px-8 sm:px-12">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <SheetClose
                nativeButton={false}
                render={
                  <Button
                    className="flex-1"
                    render={<Link href={siteUrl()} />}
                    size="lg"
                    variant="outline"
                  />
                }
              >
                Website
              </SheetClose>
              <SheetClose
                nativeButton={false}
                render={
                  <Button
                    className="flex-1"
                    render={<Link href={appUrl()} />}
                    size="lg"
                  />
                }
              >
                Dashboard
              </SheetClose>
            </div>
            <Navigation noAnimation onNavigate={() => setOpen(false)} />
          </div>
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
};
