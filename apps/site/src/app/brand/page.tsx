import { BRAND_ASSET_URLS, Button } from "@usevon/ui";
import Image from "next/image";
import Link from "next/link";

type AssetCardProps = {
  name: string;
  description: string;
  svgUrl: string;
  pngUrl: string;
  darkBg?: boolean;
};

const AssetCard = (props: AssetCardProps) => (
  <div className="group relative overflow-hidden rounded-xl border border-border">
    <div
      className={`flex h-48 items-center justify-center p-8 ${
        props.darkBg ? "bg-zinc-900" : "bg-zinc-100"
      }`}
    >
      <Image
        alt={props.name}
        className="max-h-16 w-auto object-contain transition-transform duration-300 group-hover:scale-110"
        height={80}
        src={props.svgUrl}
        width={200}
      />
    </div>
    <div
      className={`absolute inset-x-0 bottom-0 flex items-center justify-between p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
        props.darkBg ? "text-white" : "text-zinc-900"
      }`}
    >
      <div>
        <p className="font-medium">{props.name}</p>
        <p
          className={`text-sm ${props.darkBg ? "text-zinc-400" : "text-zinc-500"}`}
        >
          {props.description}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          render={
            <a href={props.svgUrl} rel="noopener noreferrer" target="_blank" />
          }
          variant={props.darkBg ? "ghost-light" : "ghost-dark"}
        >
          SVG
        </Button>
        <Button
          render={
            <a href={props.pngUrl} rel="noopener noreferrer" target="_blank" />
          }
          variant={props.darkBg ? "ghost-light" : "ghost-dark"}
        >
          PNG
        </Button>
      </div>
    </div>
  </div>
);

export default function BrandPage() {
  return (
    <main className="py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex max-w-2xl flex-col gap-4">
          <h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
            Brand
          </h1>
          <p className="text-lg text-muted-foreground">
            Resources and guidelines for using the Von brand.
          </p>
        </div>

        <div className="mt-12">
          <h2 className="font-semibold text-foreground text-xl">Naming</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground text-sm/7">
            &ldquo;Von&rdquo; comes from the Icelandic word for
            &ldquo;hope&rdquo; and is always written with a capital V, with
            all-caps &ldquo;VON&rdquo; reserved for logos and stylized displays.
          </p>
        </div>

        <div className="mt-12">
          <h2 className="mb-6 font-semibold text-foreground text-xl">Logo</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <AssetCard
              description="Light background"
              name="Wordmark"
              pngUrl={BRAND_ASSET_URLS.wordmarkBlackPng}
              svgUrl={BRAND_ASSET_URLS.wordmarkBlackSvg}
            />
            <AssetCard
              darkBg
              description="Dark background"
              name="Wordmark"
              pngUrl={BRAND_ASSET_URLS.wordmarkWhitePng}
              svgUrl={BRAND_ASSET_URLS.wordmarkWhiteSvg}
            />
            <AssetCard
              description="Light background"
              name="Icon"
              pngUrl={BRAND_ASSET_URLS.iconBlackPng}
              svgUrl={BRAND_ASSET_URLS.iconBlackSvg}
            />
            <AssetCard
              darkBg
              description="Dark background"
              name="Icon"
              pngUrl={BRAND_ASSET_URLS.iconWhitePng}
              svgUrl={BRAND_ASSET_URLS.iconWhiteSvg}
            />
          </div>
        </div>

        <div className="mt-12">
          <h2 className="font-semibold text-foreground text-xl">Questions</h2>
          <p className="mt-4 max-w-2xl text-muted-foreground text-sm/7">
            Need something else?{" "}
            <Link
              className="font-medium text-foreground underline underline-offset-4"
              href="/contact"
            >
              Contact us
            </Link>{" "}
            and we&apos;ll help you out.
          </p>
        </div>
      </div>
    </main>
  );
}
