"use client";

import { CheckIcon, CopyIcon, TerminalWindowIcon } from "@phosphor-icons/react";
import { Button } from "@usevon/ui";
import {
  createContext,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useContext,
  useRef,
  useState,
} from "react";
import { TypeScriptIcon } from "@/components/icons";

type LanguageMeta = {
  label: string;
  icon: "terminal" | "typescript" | null;
};

const languageMeta: Record<string, LanguageMeta> = {
  bash: { label: "Terminal", icon: "terminal" },
  sh: { label: "Terminal", icon: "terminal" },
  shell: { label: "Terminal", icon: "terminal" },
  zsh: { label: "Terminal", icon: "terminal" },
  env: { label: "Terminal", icon: "terminal" },
  typescript: { label: "TypeScript", icon: "typescript" },
  ts: { label: "TypeScript", icon: "typescript" },
  tsx: { label: "TypeScript", icon: "typescript" },
  javascript: { label: "JavaScript", icon: null },
  js: { label: "JavaScript", icon: null },
  jsx: { label: "JavaScript", icon: null },
  json: { label: "JSON", icon: null },
  yaml: { label: "YAML", icon: null },
  yml: { label: "YAML", icon: null },
  html: { label: "HTML", icon: null },
  css: { label: "CSS", icon: null },
  text: { label: "Text", icon: null },
  plaintext: { label: "Text", icon: null },
  python: { label: "Python", icon: null },
  go: { label: "Go", icon: null },
  rust: { label: "Rust", icon: null },
  sql: { label: "SQL", icon: null },
  graphql: { label: "GraphQL", icon: null },
  markdown: { label: "Markdown", icon: null },
  md: { label: "Markdown", icon: null },
  diff: { label: "Diff", icon: null },
};

const getTextContent = (node: ReactNode): string => {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(getTextContent).join("");
  if (isValidElement(node))
    return getTextContent((node.props as { children?: ReactNode }).children);
  return "";
};

const getLanguage = (node: ReactNode): string | null => {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = getLanguage(child);
      if (found) return found;
    }
    return null;
  }
  if (!isValidElement(node)) return null;

  const props = node.props as {
    className?: string;
    children?: ReactNode;
    [key: string]: unknown;
  };

  const className = props.className;
  if (className) {
    const match = className.match(/(?:language-|sh-lang--)([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
  }

  const shLanguage = props["data-sh-language"];
  if (typeof shLanguage === "string" && shLanguage.length > 0) {
    return shLanguage;
  }

  return getLanguage(props.children);
};

const normalizeCodeString = (value: string) => {
  const unified = value.replace(/\r\n/g, "\n");
  const trimmed = unified.replace(/^(?:\n)+/, "").replace(/(?:\n)+$/, "");
  const lines = trimmed.split("\n");

  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => (line.match(/^ +/) || [""])[0].length);

  const minIndent = indents.length > 0 ? Math.min(...indents) : 0;

  if (minIndent > 0) {
    return lines
      .map((line) =>
        line.trim().length > 0 && line.startsWith(" ".repeat(minIndent))
          ? line.slice(minIndent)
          : line
      )
      .join("\n");
  }

  return lines.join("\n");
};

const normalizeCodeElementChildren = (node: ReactNode): ReactNode => {
  if (Array.isArray(node)) {
    const normalized = node.map(normalizeCodeElementChildren);

    while (normalized.length > 0) {
      const first = normalized[0];
      if (typeof first !== "string" || first.trim() !== "") break;
      normalized.shift();
    }

    while (normalized.length > 0) {
      const last = normalized[normalized.length - 1];
      if (typeof last !== "string" || last.trim() !== "") break;
      normalized.pop();
    }

    return normalized;
  }

  if (!isValidElement(node)) return node;

  const element = node as ReactElement<{ children?: ReactNode }>;
  const children = element.props.children;

  if (typeof children === "string") {
    return cloneElement(element, undefined, normalizeCodeString(children));
  }

  if (Array.isArray(children)) {
    const normalized = [...children];

    while (normalized.length > 0) {
      const first = normalized[0];
      if (typeof first !== "string" || first.trim() !== "") break;
      normalized.shift();
    }

    while (normalized.length > 0) {
      const last = normalized[normalized.length - 1];
      if (typeof last !== "string" || last.trim() !== "") break;
      normalized.pop();
    }

    if (normalized.length > 0 && typeof normalized[0] === "string") {
      normalized[0] = normalizeCodeString(normalized[0]);
    }

    if (
      normalized.length > 1 &&
      typeof normalized[normalized.length - 1] === "string"
    ) {
      normalized[normalized.length - 1] = normalizeCodeString(
        normalized[normalized.length - 1]
      );
    }

    return cloneElement(element, undefined, normalized);
  }

  return element;
};

type CodeBlockProps = React.ComponentPropsWithoutRef<"pre">;

export const CodeBlockInGroupContext = createContext(false);

export const CodeBlock = (props: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const inCodeGroup = useContext(CodeBlockInGroupContext);
  const normalizedChildren = normalizeCodeElementChildren(props.children);
  const language = getLanguage(props.children);
  const meta = language
    ? languageMeta[language] || { label: language, icon: null }
    : { label: "Code", icon: null };
  const label = meta.label;
  const { children: _children, ...preProps } = props;

  const copy = () => {
    const text = preRef.current?.textContent ?? "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

   if (inCodeGroup) {
    return (
      <div className="overflow-x-auto px-4 py-3 font-mono text-sm">
        <pre
          ref={preRef}
          {...preProps}
          className="m-0 border-none bg-transparent p-0 leading-6 [&_.sh__line]:m-0 [&_.sh__line]:leading-6"
          style={{
            margin: 0,
            padding: 0,
            border: "none",
            background: "transparent",
            borderRadius: 0,
            lineHeight: 1.5,
          }}
        >
          {normalizedChildren}
        </pre>
      </div>
    );
  }

  return (
    <div className="my-6 overflow-hidden border border-[#dde1e6] bg-[#eff1f4] dark:border-white/14 dark:bg-white/8" data-slot="code-block">
      <div className="flex h-10 items-center justify-between border-b border-[#dde1e6] pl-4 pr-1 dark:border-white/14" data-slot="code-block-header">
        <div className="flex items-center gap-1.5 font-medium font-mono text-muted-foreground text-xs">
          {meta.icon === "terminal" ? (
            <TerminalWindowIcon className="size-4.5" weight="regular" />
          ) : null}
          {meta.icon === "typescript" ? (
            <TypeScriptIcon className="size-4.5" />
          ) : null}
          <span>{label}</span>
        </div>
        <Button
          className="relative opacity-70 hover:opacity-100 [:active,[data-pressed]]:!scale-[0.97]"
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
      <div
        className="overflow-x-auto px-4 py-3 font-mono text-sm"
        data-slot="code-block-content"
      >
        <pre
          ref={preRef}
          {...preProps}
          className="m-0 border-none bg-transparent p-0 leading-6 [&_.sh__line]:m-0 [&_.sh__line]:leading-6"
          style={{
            margin: 0,
            padding: 0,
            border: "none",
            background: "transparent",
            borderRadius: 0,
            lineHeight: 1.5,
          }}
        >
          {normalizedChildren}
        </pre>
      </div>
    </div>
  );
};
