import { TreeNode, NType } from "./types";

export function is<T extends NType, U extends TreeNode<T>>(
  node: TreeNode<NType>,
  type: T
): node is U {
  return node.type === type;
}
