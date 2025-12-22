"use client";

import Link from "next/link";
import { Button } from "@usevon/ui";
import { Wallpaper } from "@/components/wallpaper";

export const Hero = () => {
  return (
    <section className="flex flex-col gap-16 px-2 pb-16">
      <Wallpaper className="rounded-lg">
        <div className="-mx-2 sm:px-6 md:px-12 lg:px-0">
          <div className="mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
            <div className="flex gap-x-10 gap-y-16 max-lg:flex-col sm:gap-y-24">
              <div className="flex shrink-0 flex-col items-start gap-6 pt-16 sm:pt-32 lg:basis-2xl lg:py-40">
                <h1 className="max-w-5xl text-5xl/12 font-semibold tracking-[-0.04em] text-balance text-white sm:text-[4rem]/16">
                  Webhooks infrastructure that just works.
                </h1>
                <p className="flex max-w-3xl flex-col gap-4 text-lg/8 text-white/70">
                  Reliable webhook delivery with automatic retries, circuit breakers, and real-time monitoring so you can focus on building your product.
                </p>
                <div className="flex items-center gap-4">
                  <Button size="lg" nativeButton={false} render={<Link href="/signup" />}>
                    Get started
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    nativeButton={false}
                    className="text-white hover:bg-white/10 hover:text-white"
                    render={<Link href="https://github.com/usevon/von" target="_blank" />}
                  >
                    Documentation
                  </Button>
                </div>
              </div>
              <div className="lg:pt-24">
                <div className="relative h-72 sm:h-92 md:h-125 lg:size-full">
                  <div className="absolute inset-y-0 left-0 flex w-screen overflow-hidden max-lg:rounded-t-lg lg:rounded-tl-lg">
                    <div className="h-full w-full bg-white/10 dark:bg-black/20" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Wallpaper>
    </section>
  );
};
