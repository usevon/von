"use client";

import { Button, Card, Tabs, TabsList, TabsTab, TabsPanel, cn } from "@usevon/ui";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { Children, isValidElement, useState, type ReactNode } from "react";

const getTextContent = (node: ReactNode): string => {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(getTextContent).join("");
  if (isValidElement(node)) {
    return getTextContent((node.props as { children?: ReactNode }).children);
  }
  return "";
};

const CopyButton = (props: { code: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(props.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" onClick={copy} className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
      {copied ? <CheckIcon className="text-emerald-500" /> : <CopyIcon />}
    </Button>
  );
};

export const CodeGroup = (props: { children: ReactNode }) => {
  const [selected, setSelected] = useState("0");
  const children = Children.toArray(props.children).filter(isValidElement);
  const tabs = children.map((c, i) => (c.props as { title?: string }).title || `Tab ${i + 1}`);

  return (
    <Card className="not-prose my-6 gap-0 overflow-hidden p-0">
      <Tabs value={selected} onValueChange={setSelected} className="gap-0">
        <div className="border-b px-2">
          <TabsList variant="underline">
            {tabs.map((t, i) => <TabsTab key={i} value={String(i)}>{t}</TabsTab>)}
          </TabsList>
        </div>
        {children.map((child, i) => {
          const code = getTextContent(child);
          return (
            <TabsPanel key={i} value={String(i)}>
              <div className="group relative p-4 [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-sm [&_[data-slot=card]]:m-0 [&_[data-slot=card]]:border-0 [&_[data-slot=card]]:p-0 [&_[data-slot=card]]:shadow-none">
                {child}
                <CopyButton code={code} />
              </div>
            </TabsPanel>
          );
        })}
      </Tabs>
    </Card>
  );
};

export const CodeGroupTab = (props: { title: string; children: ReactNode }) => <>{props.children}</>;

export const Code = (props: React.ComponentPropsWithoutRef<"code">) => <code {...props} />;

export const Pre = (props: React.ComponentPropsWithoutRef<"pre">) => {
  const code = getTextContent(props.children);
  return (
    <Card className="not-prose group relative my-6 gap-0 overflow-hidden p-4">
      <pre {...props} className={cn("overflow-x-auto font-mono text-sm", props.className)} />
      <CopyButton code={code} />
    </Card>
  );
};
