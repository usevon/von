import type { MDXComponents } from "mdx/types";

import { Properties, Property } from "@/mdx/properties";
import { Row, Col } from "@/mdx/row-col";
import { CodeGroup, CodeGroupTab, Code, Pre } from "@/mdx/code-group";
import { H1, H2, H3, H4, P, A, Ul, Ol, Li, Blockquote, Hr, Table, Th, Td, Strong, InlineCode } from "@/mdx/elements";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Properties,
    Property,
    Row,
    Col,
    CodeGroup,
    CodeGroupTab,
    pre: Pre,
    code: (props) => {
      const isInline = typeof props.children === "string" && !props.className;
      return isInline ? <InlineCode {...props} /> : <Code {...props} />;
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
