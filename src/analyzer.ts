import { TreeNode, K_TYPE, K_BOOL, Operators, K_NIL } from "./types";
import { is } from "./helpers";

export class AnalyzerError extends Error {}
const REGEXP_NUMBER = /^[\+\-]?\d*\.?\d+(?:[Ee][\+\-]?\d+)?$/;

export function analyzer(roots: TreeNode[]): TreeNode[] {
  function _analysis(root) {
    const stack: TreeNode[] = [];

    stack.push(root);

    while (stack.length > 0) {
      const node = stack.pop() as TreeNode;

      if (is(node, "EXPR") || is(node, "LIST")) {
        node.val = node.length;

        for (const child of node.children) {
          stack.push(child);
        }
      } else {
        const val = node.val as string;

        if (Object.values(K_TYPE).includes(val as K_TYPE)) {
          node.type = "TYPE";
        } else if (Object.values(K_BOOL).includes(val as K_BOOL)) {
          node.type = "BOOL";
        } else if (Object.values(Operators).includes(val as Operators)) {
          node.type = "OPERATOR";
        } else if (val === K_NIL) {
          node.type = "NIL";
        } else if (REGEXP_NUMBER.test(val)) {
          node.type = "NUMBER";
          (node as TreeNode<"NUMBER">).val = parseFloat(val);
        } else if (val.startsWith('"') && val.endsWith('"')) {
          node.type = "STRING";
          (node as TreeNode<"STRING">).val = val.slice(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          node.type = "CHAR";

          const char = val.slice(1, val.length - 1);
          if (char.length === 1) {
            (node as TreeNode<"CHAR">).val = char;
          } else {
            throw new AnalyzerError();
          }
        } else {
          node.type = "SYMBOL";
        }
      }
    }
  }

  for (const root of roots) {
    _analysis(root);
  }

  return roots;
}
