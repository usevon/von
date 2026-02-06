import Image from "next/image";
import Link from "next/link";
import { Button } from "@usevon/ui";
import { Wallpaper } from "@/components/wallpaper";
import { urls } from "@/lib/urls";

export const Hero = () => {
  return (
    <section className="py-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-6 lg:px-10">
        {/* Text content */}
        <div className="flex flex-col items-start gap-6">
          <h1 className="max-w-5xl text-5xl/12 font-semibold tracking-[-0.04em] text-balance sm:text-[4rem]/16">
            Webhooks infrastructure that just works.
          </h1>
          <p className="flex max-w-3xl flex-col gap-4 text-lg/8 text-muted-foreground">
            Reliable webhook delivery with automatic retries, circuit breakers, and real-time
            monitoring so you can focus on building your product.
          </p>
          <div className="flex items-center gap-4">
            <Button size="lg" render={<Link href={urls.signup} />}>
              Get started
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="https://github.com/usevon/von" target="_blank" />}
            >
              Documentation
            </Button>
          </div>
        </div>

        {/* Demo screenshot */}
        <Wallpaper className="rounded-lg">
          <div className="relative p-[min(10%,4rem)] pb-0">
            <div className="relative overflow-hidden rounded-t-lg bg-background/75 ring-1 ring-black/10 dark:bg-black/75">
              <Image
                src="/screenshot.png"
                alt="Von Dashboard"
                className="w-full"
                width={2880}
                height={1800}
                priority
              />
            </div>
          </div>
        </Wallpaper>
      </div>
    </section>
  );
};
