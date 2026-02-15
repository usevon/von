import { Button } from "@usevon/ui";
import { BRAND_ASSET_URLS } from "@usevon/ui/lib/utils";
import Image from "next/image";
import Link from "next/link";

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
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
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
      {/* Heading */}
      <div className="px-8 pt-16 pb-12 sm:px-12">
        <h1 className="font-semibold text-4xl tracking-tight sm:text-5xl">
          Brand
        </h1>
        <p className="mt-3 text-muted-foreground">
          Resources and guidelines for using the Von brand.
        </p>
      </div>

      {/* Naming */}
      <div className="px-8 pb-12 sm:px-12">
        <h2 className="font-semibold text-lg">Naming</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground text-sm/7">
          &ldquo;Von&rdquo; comes from the Icelandic word for
          &ldquo;hope&rdquo; and is always written with a capital V.
          All-caps &ldquo;VON&rdquo; is reserved for logos and stylized
          displays.
        </p>
      </div>

      {/* Logo assets */}
      <div className="border-t border-border px-8 py-12 sm:px-12">
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

      {/* Contact */}
      <div className="border-t border-border px-8 py-16 pb-24 sm:px-12">
        <p className="text-muted-foreground text-sm">
          Need something not listed here?{" "}
          <Link
            className="text-foreground underline underline-offset-4"
            href="/contact"
          >
            Get in touch
          </Link>
        </p>
      </div>
    </main>
  );
}
