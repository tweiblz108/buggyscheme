import { Token, TreeNode } from "./types";

export class ParserError extends Error {
  constructor(token: Token) {
    super(token.toString());
  }
}

export function parser(tokens: Token[]): TreeNode[] {
  const roots: TreeNode[] = [];
  const parents: TreeNode[] = [];

  for (const token of tokens) {
    const { str } = token;
    const parent = parents.length > 0 ? parents[parents.length - 1] : null;

    if (str === "(") {
      parents.push(new TreeNode("EXPR", 0, token));

      if (parent) parent.addChild(parents[parents.length - 1]);
    } else if (str === "[") {
      parents.push(new TreeNode("LIST", 0, token));

      if (parent) parent.addChild(parents[parents.length - 1]);
    } else if (str === ")") {
      const node = parents.pop();

      if (!node || node.type !== "EXPR") {
        throw new ParserError(token);
      } else {
        if (!node.parent) {
          roots.push(node);
        } else {
          // nothing
        }
      }
    } else if (str === "]") {
      const node = parents.pop();

      if (!node || node.type !== "LIST") {
        throw new ParserError(token);
      } else {
        if (!node.parent) {
          roots.push(node);
        } else {
          // nothing
        }
      }
    } else {
      const node = new TreeNode("UNKNOWN", str, token);
      if (parent) {
        parent.addChild(node);
      } else {
        roots.push(node);
      }
    }
  }

  if (parents.length > 0) {
    throw new ParserError(<Token>parents[parents.length - 1].token);
  } else {
    return roots;
  }
}
