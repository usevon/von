import { cn, highlightCode } from "@/lib/utils";

type CodeProps = {
  children: string;
  className?: string;
};

/**
 * Server-safe syntax-highlighted code block.
 *
 * Uses sugar-high via `highlightCode` (re-exported from `@usevon/ui/lib/utils`)
 * so the `--sh-*` theme tokens from globals.css are applied automatically.
 *
 * Scoped dark `--sh-*` overrides are set inline so the block always renders
 * with dark syntax colors — necessary when placed on the wallpaper gradient
 * which is always visually dark regardless of the site theme.
 */
const darkSyntaxVars = {
  "--sh-class": "#b392f0",
  "--sh-identifier": "#e1e4e8",
  "--sh-sign": "#6a737d",
  "--sh-property": "#79b8ff",
  "--sh-entity": "#85e89d",
  "--sh-jsxliterals": "#9ecbff",
  "--sh-string": "#9ecbff",
  "--sh-keyword": "#f97583",
  "--sh-comment": "#6a737d",
} as React.CSSProperties;

export function Code({ children, className }: CodeProps) {
  const html = highlightCode(children);

  return (
    <pre
      className={cn(
        "w-full max-w-lg overflow-x-auto border border-white/10 bg-black/40 p-6 font-mono text-sm leading-relaxed backdrop-blur-sm",
        "[&_.sh__line]:leading-relaxed",
        className
      )}
      style={darkSyntaxVars}
    >
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: sugar-high produces sanitized HTML */}
      <code dangerouslySetInnerHTML={{ __html: html }} />
    </pre>
  );
}
