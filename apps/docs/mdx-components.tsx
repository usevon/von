import type { MDXComponents } from "mdx/types";
import { isValidElement, type ReactNode } from "react";

import { CopyButton } from "@/components/copy-button";
import { PageActions } from "@/components/docs/page-actions";
import { CodeGroup, CodeGroupTab } from "@/mdx/code-group";
import {
  A,
  Blockquote,
  H1,
  H2,
  H3,
  H4,
  Hr,
  InlineCode,
  Li,
  Ol,
  P,
  Strong,
  Table,
  Td,
  Th,
  Ul,
} from "@/mdx/elements";
import { Properties, Property } from "@/mdx/properties";
import { Col, Row } from "@/mdx/row-col";
import { Timeline, TimelineItem } from "@/mdx/timeline";

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
    PageActions,
    pre: (props: React.ComponentPropsWithoutRef<"pre">) => {
      const code = getTextContent(props.children);
      return (
        <div className="group relative">
          {code ? <CopyButton value={code} /> : null}
          <pre {...props} />
        </div>
      );
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
