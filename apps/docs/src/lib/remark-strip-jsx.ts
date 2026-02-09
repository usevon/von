import type { Parent, Root } from "mdast";
import { visit } from "unist-util-visit";

export function remarkStripJsx() {
  return (tree: Root) => {
    visit(tree, (node, index, parent) => {
      // Remove JSX elements but keep their markdown children
      if (
        (node.type === "mdxJsxFlowElement" ||
          node.type === "mdxJsxTextElement") &&
        parent &&
        typeof index === "number"
      ) {
        const children = (node as Parent).children || [];
        parent.children.splice(index, 1, ...children);
        return index; // Re-visit this index since we modified the array
      }

      // Remove import/export statements
      if (node.type === "mdxjsEsm" && parent && typeof index === "number") {
        parent.children.splice(index, 1);
        return index;
      }
    });
  };
}
