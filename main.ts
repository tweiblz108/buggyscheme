const program = "(+ (+ 1 1) 1)";

interface Pos {
  row: number;
  column: number;
}

function Pos(row: number, column: number): Pos {
  return { row, column };
}

class Token {
  str: string;
  pos: Pos;

  constructor(str: string, pos: Pos) {
    this.str = str;
    this.pos = pos;
  }

  toString() {
    const {
      str,
      pos: { row, column },
    } = this;

    return `${row}:${column} ${str}`;
  }
}

enum NodeType {
  EXPR,
  SYMBOL,
  NUMBER,
  OPERATOR,
  LAMBDA,
  LIST,
  BOOL,
  STRING,
  TYPE,

  EVAL,
  PACK,
}

type NormalNode = TreeNode<Exclude<NodeType, StructureNode>>
type StructureNode = NodeType.PACK | NodeType.EVAL
type ContainerNode = NodeType.EXPR | NodeType.LIST

class TreeNode<T extends NodeType> {

  type: NodeType;
  token?: Token;
  val: string | number | boolean;
  parent: TreeNode<ContainerNode> | null = null;
  children: TreeNode<T>[];

  constructor(type: T, val: any, token?: Token) {
    this.type = type;
    this.val = val;
    this.children = [];
    this.token = token;
  }

  addChild(child: NormalNode) {
    child.parent = <TreeNode<ContainerNode>> this;

    this.children.push(child);
  }

  addChildren(children: NormalNode[]) {
    for (const child of children) {
      this.addChild(child);
    }
  }

  isRoot() {
    return this.parent === null;
  }
}

function lexer(program: string) {
  const tokens = [];

  let row = 1;
  let a = 0;
  let b = 0;

  const terminals = ["(", ")", "[", "]", " "];
  const delimiters = ["(", ")", "[", "]"];

  while (b < program.length) {
    const c = program[b];

    if (terminals.includes(c)) {
      if (a !== b) {
        const pos = Pos(row, a + 1);
        const token = new Token(program.substring(a, b), pos);

        tokens.push(token);
      }

      if (delimiters.includes(c)) {
        const pos = Pos(row, b + 1);
        const token = new Token(c, pos);

        tokens.push(token);
      }

      b += 1;
      a = b;
    } else {
      b += 1;
    }
  }

  return tokens;
}

enum Operator {
  ADD = "+",
  SUB = "-",
  MUL = "*",
  DIV = "/",
  MOD = "%",
}

class ParseError {
  token: Token;

  constructor(token: Token) {
    this.token = token;
  }
}

const REGEXP_NUMBER = /^[\+\-]?\d*\.?\d+(?:[Ee][\+\-]?\d+)?$/;

function parser(tokens: Token[]) {
  const parents: TreeNode<any>[] = [];

  for (const [i, token] of tokens.entries()) {
    const { str } = token;
    const parent = parents.length > 0 ? parents[parents.length - 1] : null;

    if (str === "(") {
      parents.push(new TreeNode(NodeType.EXPR, str, token));

      if (parent) parent.addChild(parents[parents.length - 1]);
    } else if (str === ")") {
      const node = parents.pop();

      if (node) {
        if (node.isRoot()) {
          if (i === tokens.length - 1) {
            return node;
          } else {
            throw new ParseError(tokens[i + 1]);
          }
        }
      } else {
        throw new ParseError(token);
      }
    } else {
      if (parent) {
        if (REGEXP_NUMBER.test(str)) {
          parent.addChild(new TreeNode(NodeType.NUMBER, str, token));
        } else {
          parent.addChild(new TreeNode(NodeType.SYMBOL, str, token));
        }
      } else {
        throw new ParseError(token);
      }
    }
  }

  throw new ParseError(<Token>parents[parents.length - 1].token);
}

class InterpreterError {
  message: string;

  constructor(message: string = "") {
    this.message = message;
  }

  toString() {
    return this.message;
  }
}

type EnvNode = Exclude<NodeType, StructureNode | ParentNode | NodeType.SYMBOL>

class Env {
  parent: Env | null = null;
  map: Map<string, TreeNode<EnvNode>> = new Map();

  set(name: string, value: TreeNode<EnvNode>) {
    this.map.set(name, value);
  }

  lookup(name: string): TreeNode<EnvNode> | null {
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

function baseEnv() {
  const env = new Env();

  env.set("+", new TreeNode(NodeType.OPERATOR, Operator.ADD));
  env.set("-", new TreeNode(NodeType.OPERATOR, Operator.SUB));
  env.set("*", new TreeNode(NodeType.OPERATOR, Operator.MUL));
  env.set("/", new TreeNode(NodeType.OPERATOR, Operator.DIV));
  env.set("%", new TreeNode(NodeType.OPERATOR, Operator.MOD));

  return env;
}

function calculator(op: TreeNode<NodeType.OPERATOR>, operandStack: TreeNode<any>[]) {
  if (op.val === Operator.ADD) {
    const [a, b] = operandStack.splice(-2)

    operandStack.push(new TreeNode(NodeType.NUMBER, ((<number> a.val) + (<number> b.val)).toString(), op.token))
  }
}

function interpreter(root: TreeNode<ContainerNode>) {
  const env = baseEnv();
  const runtimeStack: TreeNode<any>[] = [];
  const operandStack: TreeNode<EnvNode>[] = [];

  runtimeStack.push(root);

  while (runtimeStack.length > 0) {
    const node = <TreeNode<any>>runtimeStack.pop();

    if (node.type === NodeType.EVAL) {
      if (operandStack.length) {
        const op = <TreeNode<any>>operandStack.pop();

        if (op.type === NodeType.OPERATOR) {
          calculator(op, operandStack)
        } else if (op.type === NodeType.LAMBDA) {
          // not implemented
        } else {
          throw new InterpreterError();
        }
      } else {
        throw new InterpreterError();
      }
    } else if (node.type === NodeType.EXPR) {
      runtimeStack.push(new TreeNode(NodeType.EVAL, ""));

      for (const child of node.children) {
        runtimeStack.push(child);
      }
    } else if (node.type === NodeType.PACK) {
      const length = <number>node.val;
      const listNode = new TreeNode(NodeType.LIST, "", node.token);

      for (const listItem of operandStack.splice(-length)) {
        listNode.addChild(listItem);
      }

      operandStack.push(listNode);
    } else if (node.type === NodeType.LIST) {
      runtimeStack.push(
        new TreeNode(NodeType.PACK, node.children.length.toString(), node.token)
      );

      for (const child of node.children) {
        runtimeStack.push(child);
      }
    } else if (node.type === NodeType.SYMBOL) {
      const result = env.lookup(<string>node.val);

      if (result) {
        operandStack.push(result);
      } else {
        throw new InterpreterError(`undefined symbol ${node.val}`);
      }
    } else {
      operandStack.push(node);
    }
  }

  return <TreeNode<EnvNode>> operandStack.pop()
}

function main() {
  try {
    console.log(interpreter(parser(lexer(program))));
  } catch (e) {
    console.log((e as ParseError).token.toString());
  }
}

main();
