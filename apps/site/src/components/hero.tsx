import { Button } from "@usevon/ui";
import Image from "next/image";
import Link from "next/link";
import { Wallpaper } from "@/components/wallpaper";
import { docsUrl, urls } from "@/lib/urls";

export const Hero = () => {
  return (
    <section className="py-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-6 lg:px-10">
        {/* Text content */}
        <div className="flex flex-col items-start gap-6">
          <h1 className="max-w-5xl text-balance font-semibold text-5xl/12 tracking-[-0.04em] sm:text-[4rem]/16">
            Webhooks infrastructure that just works.
          </h1>
          <p className="flex max-w-3xl flex-col gap-4 text-lg/8 text-muted-foreground">
            Reliable webhook delivery with automatic retries, circuit breakers,
            and real-time monitoring so you can focus on building your product.
          </p>
          <div className="flex items-center gap-4">
            <Button render={<Link href={urls.signup} />} size="lg">
              Get started
            </Button>
            <Button
              render={<Link href={docsUrl()} />}
              size="lg"
              variant="outline"
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
                alt="Von Dashboard"
                className="w-full"
                height={1800}
                priority
                src="/screenshot.png"
                width={2880}
              />
            </div>
          </div>
        </Wallpaper>
      </div>
    </section>
  );
};
