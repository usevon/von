"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { Button, Tabs, TabsList, TabsPanel, TabsTab } from "@usevon/ui";
import { Children, isValidElement, type ReactNode, useRef, useState } from "react";
import { CodeBlockInGroupContext } from "@/components/code-block";

export const CodeGroup = (props: { children: ReactNode }) => {
  const [selected, setSelected] = useState("0");
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const children = Children.toArray(props.children).filter(isValidElement);
  const tabs = children.map(
    (c, i) => (c.props as { title?: string }).title || `Tab ${i + 1}`
  );

  const copy = () => {
    const panel = contentRef.current?.querySelector("[data-state=open]");
    const text = panel?.textContent ?? "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="my-6 overflow-hidden border border-[#dde1e6] bg-[#eff1f4] dark:border-white/14 dark:bg-white/8"
      data-code-group=""
    >
      <Tabs className="gap-0" onValueChange={setSelected} value={selected}>
        <div className="flex h-10 items-center justify-between border-[#dde1e6] border-b pr-1 pl-2 dark:border-white/14">
          <TabsList variant="underline">
            {tabs.map((t, i) => (
              <TabsTab key={i} value={String(i)}>
                {t}
              </TabsTab>
            ))}
          </TabsList>
          <Button
            className="relative `[:active,[data-pressed]]:scale-[0.97]! opacity-70 hover:opacity-100"
            onClick={copy}
            size="icon-sm"
            variant="ghost"
          >
            <CopyIcon
              className="absolute transition-[opacity,filter] duration-200"
              style={{
                opacity: copied ? 0 : 1,
                filter: copied ? "blur(2px)" : "blur(0px)",
              }}
            />
            <CheckIcon
              className="absolute text-primary transition-[opacity,filter] duration-200"
              style={{
                opacity: copied ? 1 : 0,
                filter: copied ? "blur(0px)" : "blur(2px)",
              }}
            />
          </Button>
        </div>
        <div ref={contentRef}>
          {children.map((child, i) => (
            <TabsPanel key={i} value={String(i)}>
              <CodeBlockInGroupContext.Provider value>
                {child}
              </CodeBlockInGroupContext.Provider>
            </TabsPanel>
          ))}
        </div>
      </Tabs>
    </div>
  );
};

export const CodeGroupTab = (props: { title: string; children: ReactNode }) => (
  <>{Children.toArray(props.children).filter(isValidElement)}</>
);
