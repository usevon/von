import type { MDXComponents } from "mdx/types";
import { Children, isValidElement, type ReactNode } from "react";

import { CopyButton } from "@/components/copy-button";
import { CodeGroup, CodeGroupTab } from "@/mdx/code-group";
import { Properties, Property } from "@/mdx/properties";
import { Row, Col } from "@/mdx/row-col";
import { Timeline, TimelineItem } from "@/mdx/timeline";
import { H1, H2, H3, H4, P, A, Ul, Ol, Li, Blockquote, Hr, Table, Th, Td, Strong, InlineCode } from "@/mdx/elements";

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

type FigureProps = React.ComponentPropsWithoutRef<"figure"> & {
  "data-rehype-pretty-code-figure"?: string;
};

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Properties,
    Property,
    Row,
    Col,
    CodeGroup,
    CodeGroupTab,
    Timeline,
    TimelineItem,
    figure: (props: FigureProps) => {
      const isCodeBlock = props["data-rehype-pretty-code-figure"] !== undefined;
      if (isCodeBlock) {
        const code = getTextContent(props.children);
        return (
          <figure {...props}>
            {code && <CopyButton value={code} />}
            {props.children}
          </figure>
        );
      }
      return <figure {...props} />;
    },
    code: (props: React.ComponentPropsWithoutRef<"code">) => {
      const isInline = typeof props.children === "string" && !props.className;
      return isInline ? <InlineCode {...props} /> : <code {...props} />;
    },
    h1: H1,
    h2: H2,
    h3: H3,
    h4: H4,
    p: P,
    a: A,
    ul: Ul,
    ol: Ol,
    li: Li,
    blockquote: Blockquote,
    hr: Hr,
    table: Table,
    th: Th,
    td: Td,
    strong: Strong,
  };
}
