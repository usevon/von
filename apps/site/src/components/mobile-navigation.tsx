"use client";

import { ListIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import {
  Button,
  Sheet,
  SheetClose,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@usevon/ui";
import { docsUrl, urls } from "@/lib/urls";

export function MobileNavigation() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button className="lg:hidden" size="icon-lg" variant="outline" />
        }
      >
        <ListIcon className="size-4" />
      </SheetTrigger>
      <SheetPopup showCloseButton={false} side="right">
        <div className="flex h-16 items-center justify-between px-8 sm:px-12">
          <SheetTitle>Menu</SheetTitle>
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
                    render={<Link href={urls.login} />}
                    className="flex-1"
                    size="lg"
                    variant="outline"
                  />
                }
              >
                Log in
              </SheetClose>
              <SheetClose
                nativeButton={false}
                render={
                  <Button
                    render={<Link href={urls.signup} />}
                    className="flex-1"
                    size="lg"
                  />
                }
              >
                Get started
              </SheetClose>
            </div>
            <nav className="flex flex-col gap-1">
              <SheetClose
                nativeButton={false}
                render={
                  <Button
                    render={<Link href={docsUrl()} />}
                    className="w-full justify-start"
                    size="lg"
                    variant="ghost"
                  />
                }
              >
                Docs
              </SheetClose>
              <SheetClose
                nativeButton={false}
                render={
                  <Button
                    render={<Link href="/pricing" />}
                    className="w-full justify-start"
                    size="lg"
                    variant="ghost"
                  />
                }
              >
                Pricing
              </SheetClose>
            </nav>
          </div>
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
}
