"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { Button, Tabs, TabsList, TabsPanel, TabsTab } from "@usevon/ui";
import { Children, isValidElement, type ReactNode, useState } from "react";

const getTextContent = (node: ReactNode): string => {
  if (typeof node === "string") {
    return node;
  }
  if (typeof node === "number") {
    return String(node);
  }
  if (!node) {
    return "";
  }
  if (Array.isArray(node)) {
    return node.map(getTextContent).join("");
  }
  if (isValidElement(node)) {
    return getTextContent((node.props as { children?: ReactNode }).children);
  }
  return "";
};

export const CodeGroup = (props: { children: ReactNode }) => {
  const [selected, setSelected] = useState("0");
  const [copied, setCopied] = useState(false);
  const children = Children.toArray(props.children).filter(isValidElement);
  const tabs = children.map(
    (c, i) => (c.props as { title?: string }).title || `Tab ${i + 1}`
  );
  const code = getTextContent(children[Number(selected)]);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="my-6 overflow-hidden rounded-xl border border-border bg-muted"
      data-code-group=""
    >
      <Tabs className="gap-0" onValueChange={setSelected} value={selected}>
        <div className="flex items-center justify-between border-b px-2">
          <TabsList variant="underline">
            {tabs.map((t, i) => (
              <TabsTab key={i} value={String(i)}>
                {t}
              </TabsTab>
            ))}
          </TabsList>
          <Button
            className="opacity-70 hover:opacity-100"
            onClick={copy}
            size="icon"
            variant="ghost"
          >
            {copied ? <CheckIcon className="text-emerald-500" /> : <CopyIcon />}
          </Button>
        </div>
        {children.map((child, i) => (
          <TabsPanel key={i} value={String(i)}>
            <div className="px-4 py-3">{child}</div>
          </TabsPanel>
        ))}
      </Tabs>
    </div>
  );
};

export const CodeGroupTab = (props: { title: string; children: ReactNode }) => (
  <>{props.children}</>
);
