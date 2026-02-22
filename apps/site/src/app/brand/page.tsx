import { Button } from "@usevon/ui";
import { BRAND_ASSET_URLS } from "@usevon/ui/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { Cta } from "@/components/cta";

type AssetCardProps = {
  name: string;
  description: string;
  svgUrl: string;
  pngUrl: string;
  dark?: boolean;
};

function AssetCard(props: AssetCardProps) {
  return (
    <div className="group border border-border">
      <div
        className={`flex h-48 items-center justify-center p-8 ${
          props.dark ? "bg-zinc-900" : "bg-zinc-100"
        }`}
      >
        <Image
          alt={props.name}
          className="max-h-16 w-auto object-contain"
          height={80}
          src={props.svgUrl}
          width={200}
        />
      </div>
      <div className="flex items-center justify-between border-border border-t px-4 py-3">
        <div>
          <p className="font-medium text-sm">{props.name}</p>
          <p className="text-muted-foreground text-xs">{props.description}</p>
        </div>
        <div className="flex gap-1">
          <Button
            render={
              <a href={props.svgUrl} rel="noopener noreferrer" target="_blank">
                SVG
              </a>
            }
            size="sm"
            variant="outline"
          />
          <Button
            render={
              <a href={props.pngUrl} rel="noopener noreferrer" target="_blank">
                PNG
              </a>
            }
            size="sm"
            variant="outline"
          />
        </div>
      </div>
    </div>
  );
}

export default function BrandPage() {
  return (
    <main>
      <div className="px-8 pt-16 pb-12 sm:px-12">
        <h1 className="font-semibold text-4xl tracking-tight sm:text-5xl">
          Brand
        </h1>
        <p className="mt-3 text-muted-foreground">
          Resources and guidelines for using the Von brand.
        </p>
      </div>

      <div className="flex flex-col gap-16 px-8 pb-24 sm:px-12">
        <div>
          <h2 className="font-semibold text-lg">Naming</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground text-sm/7">
            Von is the Icelandic word for hope, always capitalized as
            &ldquo;Von&rdquo; except in logos where &ldquo;VON&rdquo; is used.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-lg">Logo</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <AssetCard
              description="Light background"
              name="Wordmark"
              pngUrl={BRAND_ASSET_URLS.wordmarkBlackPng}
              svgUrl={BRAND_ASSET_URLS.wordmarkBlackSvg}
            />
            <AssetCard
              dark
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
              dark
              description="Dark background"
              name="Icon"
              pngUrl={BRAND_ASSET_URLS.iconWhitePng}
              svgUrl={BRAND_ASSET_URLS.iconWhiteSvg}
            />
          </div>
        </div>
      </div>

      <Cta
        actions={
          <Button render={<Link href="mailto:hello@usevon.com" />} size="xl">
            Get in touch
          </Button>
        }
        heading={
          <>
            Need something
            <br />
            <span className="text-foreground/50">not listed here?</span>
          </>
        }
      />
    </main>
  );
}
