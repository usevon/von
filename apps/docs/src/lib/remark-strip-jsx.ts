import type { Parent, Root } from "mdast";
import { visit } from "unist-util-visit";

export function remarkStripJsx() {
  return (tree: Root) => {
    visit(tree, (node, index, parent) => {
      if (
        (node.type === "mdxJsxFlowElement" ||
          node.type === "mdxJsxTextElement") &&
        parent &&
        typeof index === "number"
      ) {
        const children = (node as Parent).children || [];
        parent.children.splice(index, 1, ...children);
        return index;
      }

      if (node.type === "mdxjsEsm" && parent && typeof index === "number") {
        parent.children.splice(index, 1);
        return index;
      }
    });
  };
}
