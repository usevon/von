import Link from "next/link";
import Image from "next/image";
import { Button } from "@usevon/ui";

type AssetCardProps = {
  name: string;
  description: string;
  svgPath: string;
  pngPath: string;
  darkBg?: boolean;
};

const AssetCard = (props: AssetCardProps) => {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border">
      <div
        className={`flex h-48 items-center justify-center p-8 ${
          props.darkBg ? "bg-zinc-900" : "bg-zinc-100"
        }`}
      >
        <Image
          src={props.svgPath}
          alt={props.name}
          width={200}
          height={80}
          className="max-h-16 w-auto object-contain transition-transform duration-300 group-hover:scale-110"
        />
      </div>
      <div
        className={`absolute inset-x-0 bottom-0 flex items-center justify-between p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${
          props.darkBg ? "text-white" : "text-zinc-900"
        }`}
      >
        <div>
          <p className="font-medium">{props.name}</p>
          <p className={`text-sm ${props.darkBg ? "text-zinc-400" : "text-zinc-500"}`}>
            {props.description}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={props.darkBg ? "ghost-light" : "ghost-dark"}
            render={<Link href={props.svgPath} target="_blank" />}
          >
            SVG
          </Button>
          <Button
            variant={props.darkBg ? "ghost-light" : "ghost-dark"}
            render={<Link href={props.pngPath} target="_blank" />}
          >
            PNG
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function BrandPage() {
  return (
    <main>
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex max-w-2xl flex-col gap-4">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Brand</h1>
            <p className="text-lg text-muted-foreground">
              Resources and guidelines for using the Von brand.
            </p>
          </div>
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-foreground">Naming</h2>
            <p className="mt-4 max-w-2xl text-sm/7 text-muted-foreground">
              &ldquo;Von&rdquo; comes from the Icelandic word for &ldquo;hope&rdquo; and is always written with a capital V, with all-caps &ldquo;VON&rdquo; reserved for logos and stylized displays.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <h2 className="mb-6 text-xl font-semibold text-foreground">Logo</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <AssetCard
              name="Wordmark"
              description="Light background"
              svgPath="/brand/von-wordmark-black.svg"
              pngPath="/brand/von-wordmark-black.png"
            />
            <AssetCard
              name="Wordmark"
              description="Dark background"
              svgPath="/brand/von-wordmark-white.svg"
              pngPath="/brand/von-wordmark-white.png"
              darkBg
            />
            <AssetCard
              name="Icon"
              description="Light background"
              svgPath="/brand/von-icon-black.svg"
              pngPath="/brand/von-icon-black.png"
            />
            <AssetCard
              name="Icon"
              description="Dark background"
              svgPath="/brand/von-icon-white.svg"
              pngPath="/brand/von-icon-white.png"
              darkBg
            />
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <h2 className="text-xl font-semibold text-foreground">Questions</h2>
          <p className="mt-4 max-w-2xl text-sm/7 text-muted-foreground">
            Need something else? <Link href="/contact" className="font-medium text-foreground underline underline-offset-4">Contact us</Link> and we&apos;ll help you out.
          </p>
        </div>
      </section>
    </main>
  );
}
