export class Token {
  constructor(
    public readonly str: string,
    private row: number,
    private column: number,
    private filename = "__main__"
  ) {}

  toString() {
    const { str, row, column, filename } = this;

    return `${filename}#${row}:${column} ${str}`;
  }
}

export enum Operators {
  OP_CAR = "car",
  OP_CDR = "cdr",
  OP_CONS = "cons",
  OP_COND = "cond",
  OP_IF = "if",
  OP_EQ = "eq",
  OP_LAMBDA = "lambda",
  OP_DEF = "def",
  OP_SET = "set!",
  OP_APPLY = "apply",
  OP_LET = "let",
  OP_BEGIN = "begin",
  OP_IMPORT = "import",
  OP_EXPORT = "export",
  OP_TYPE = "type",
  OP_EXIT = "exit",
  OP_ADD = "+",
  OP_SUB = "-",
  OP_MUL = "*",
  OP_DIV = "/",
  OP_MOD = "%",
  OP_GT = ">",
  OP_LT = "<",
  OP_AND = "and",
  OP_OR = "or",
  OP_NOT = "not",
  OP_DISPLAY = "display",
  OP_LENGTH = "length",
}

export enum K_TYPE {
  NUMBER = ":number",
  STRING = ":string",
  CHAR = ":char",
  BOOL = ":bool",
  LIST = ":list",
  NIL = "#nil",
  LAMBDA = ":lambda",
  TYPE = ":type",
}

export enum K_BOOL {
  T = "#t",
  F = "#f",
}

export const K_NIL = "#nil";

type NTypeContainer = "EXPR" | "LIST";
type NTypeAtom =
  | "SYMBOL"
  | "NUMBER"
  | "LAMBDA"
  | "BOOL"
  | "NIL"
  | "STRING"
  | "CHAR"
  | "TYPE"
  | "OPERATOR";
type NTypeInternal = "UNKNOWN" | "EVAL" | "FOLLOW" | "RETURN";
export type NType = NTypeContainer | NTypeAtom | NTypeInternal;

export class TreeNode<T extends NType = NType> {
  parent?: TreeNode;
  children: TreeNode[] = [];

  constructor(
    public type: T,
    public val: T extends "NUMBER" | "LIST" | "EXPR" | "EVAL"
      ? number
      : T extends "LAMBDA"
      ? [number, TreeNode<"EXPR">, TreeNode[], Env]
      : T extends "RETURN"
      ? [number, Env]
      : T extends "FOLLOW"
      ? TreeNode
      : T extends "OPERATOR"
      ? Operators
      : T extends "TYPE"
      ? K_TYPE
      : T extends "BOOL"
      ? K_BOOL
      : T extends "NIL"
      ? typeof K_NIL
      : string,
    public token?: Token
  ) {}

  addChild(child: TreeNode) {
    child.parent = this;

    this.children.push(child);

    return this;
  }

  addChildren(children: TreeNode[]) {
    for (const child of children) {
      this.addChild(child);
    }

    return this;
  }

  get length() {
    return this.children.length;
  }
}

export class Env {
  parent: Env | null = null;
  map: Map<string, TreeNode> = new Map();

  set(name: string, value: TreeNode) {
    this.map.set(name, value);
  }

  lookup(name: string): TreeNode | null {
    const node = this.map.get(name);

    if (node) {
      return node;
    } else {
      if (this.parent) {
        return this.parent.lookup(name);
      } else {
        return null;
      }
    }
  }

  extend() {
    const env = new Env();

    env.parent = this;

    return env;
  }
}
