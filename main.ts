import { readFileSync } from "fs";

// car cdr cons cond eq
// lambda def set! if apply let begin import export type exit
// + - * / % > <
// and or not
// :number :string :char :bool :list :lambda :nil :type
// #t #f #nil #lambda #args
// 基本编程模型
// if and xxxx or xxxx + xxxxx * xxxxxx lambda default with begin, [Node, Node] eval, (- x)
// no quote, no atom
// add length, overload car cdr cons for string, char type, single quote 'c' "c"
// (export (a b add cc dd))
// (export a a)
// (import '' fp) => fp/add

// 获取操作数长度
// 绑定环境 return
// 绑定关联结点 lambda
// val 的意义：操作符类型，布尔值

const program = readFileSync("./program.ss", { encoding: "utf8" });

class Token {
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

enum Operators {
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

enum K_TYPE {
  NUMBER = ":number",
  STRING = ":string",
  CHAR = ":char",
  BOOL = ":bool",
  LIST = ":list",
  NIL = "#nil",
  LAMBDA = ":lambda",
  TYPE = ":type",
}

enum K_BOOL {
  T = "#t",
  F = "#f",
}

const K_NIL = "#nil";

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
type NType = NTypeContainer | NTypeAtom | NTypeInternal;

function is<T extends NType, U extends TreeNode<T>>(
  node: TreeNode<NType>,
  type: T
): node is U {
  return node.type === type;
}

class TreeNode<T extends NType = NType> {
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

class LexerError extends Error {}

function lexer(program: string) {
  const tokens: Token[] = [];

  program = program.replace(/\r\n/gi, "\n");

  let row = 1;
  let columnDec = 0;
  let a = 0;
  let b = 0;

  let currMode: "normal" | "string" | "char" | "comment" = "normal";

  while (b < program.length) {
    const ch = program[b];

    if (currMode === "normal") {
      if (["(", ")", "[", "]", " ", "\n", ";"].includes(ch)) {
        if (a !== b) {
          const token = new Token(
            program.substring(a, b),
            row,
            a - columnDec + 1
          );

          tokens.push(token);
          a = b;
        }

        switch (ch) {
          case "(":
          case ")":
          case "[":
          case "]":
            const token = new Token(ch, row, a - columnDec + 1);

            tokens.push(token);

            a++;
            b++;
            break;
          case '"':
          case "'":
          case ";":
            currMode = {
              "'": "char",
              '"': "string",
              ";": "comment",
            }[ch] as "char" | "string" | "comment";
            b++;
            break;
          case "\n":
            a++;
            b++;
            row++;
            columnDec = b;
            break;
          default:
            a++;
            b++;
        }
      } else {
        b += 1;
      }
    } else if (currMode === "string") {
      if (ch === '"') {
        let i = b - 1;
        while (program[i] === "\\") {
          i--;
        }

        const count = b - 1 - i;

        if (count % 2 === 0) {
          const token = new Token(
            program.substring(a, b + 1),
            row,
            a - columnDec + 1
          );

          tokens.push(token);
          b += 1;
          a = b;
          currMode = "normal";
        } else {
          b += 1;
        }
      } else if (ch === "\n") {
        throw new LexerError();
      } else if (b + 1 === program.length) {
        throw new LexerError();
      } else {
        b += 1;
      }
    } else if (currMode === "char") {
      if (ch === "'") {
        const token = new Token(
          program.substring(a, b + 1),
          row,
          a - columnDec + 1
        );

        tokens.push(token);
        b += 1;
        a = b;
        currMode = "normal";
      } else if (ch === "\n") {
        throw new LexerError();
      } else if (b + 1 === program.length) {
        throw new LexerError();
      } else {
        b += 1;
      }
    } else if (currMode === "comment") {
      if (ch === "\n") {
        const token = new Token(
          program.substring(a, b),
          row,
          a - columnDec + 1
        );

        tokens.push(token);
        a = b; // let normal mode handle \n
        currMode = "normal";
      } else if (b + 1 === program.length) {
        const token = new Token(
          program.substring(a, b + 1),
          row,
          a - columnDec + 1
        );

        tokens.push(token);
        b++;
        a = b;
        currMode = "normal";
      } else {
        b += 1;
      }
    } else {
      throw new LexerError();
    }
  }

  // remove comments
  return tokens.filter(({ str }) => !str.startsWith(";"));
}

class ParseError extends Error {
  constructor(token: Token) {
    super(token.toString());
  }
}

const REGEXP_NUMBER = /^[\+\-]?\d*\.?\d+(?:[Ee][\+\-]?\d+)?$/;

function parser(tokens: Token[]) {
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
        throw new ParseError(token);
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
        throw new ParseError(token);
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
    throw new ParseError(<Token>parents[parents.length - 1].token);
  } else {
    return roots;
  }
}

class InterpreterError extends Error {
  constructor(message = "") {
    super(message);
  }
}

class Env {
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

class AnalysisError extends Error {}

function analysis(roots: TreeNode[]) {
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
            throw new AnalysisError();
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

function interpreter(roots: TreeNode[]) {
  let env = new Env();
  const runtimeStack: TreeNode[] = [];
  const operandStack: TreeNode[] = [];

  const NODE_BOOL_T = new TreeNode("BOOL", K_BOOL.T);
  const NODE_BOOL_F = new TreeNode("BOOL", K_BOOL.F);
  const NODE_NIL = new TreeNode("NIL", K_NIL);

  function _interpreter(root: TreeNode) {
    runtimeStack.push(root);

    while (runtimeStack.length > 0) {
      const curr = runtimeStack.pop() as TreeNode;

      if (is(curr, "EVAL")) {
        if (operandStack.length > 0) {
          const op = operandStack.pop() as TreeNode;

          if (is(op, "LAMBDA")) {
            // 第一段处理，检查参数个数，符合则对实际参数进行求值
            const [argsCount, paramsNode] = op.val;

            if (argsCount === paramsNode.length) {
              for (const child of paramsNode.children) {
                if (!is(child, "SYMBOL")) throw new InterpreterError();
              }

              runtimeStack.splice(-argsCount, 0, new TreeNode("FOLLOW", op));
            } else {
              throw new InterpreterError();
            }
          } else if (is(op, "OPERATOR")) {
            const argsCount = curr.val;

            switch (op.val) {
              case Operators.OP_DISPLAY:
              case Operators.OP_ADD:
                runtimeStack.splice(-argsCount, 0, new TreeNode("FOLLOW", op));
                break;
              case Operators.OP_LAMBDA:
                if (argsCount < 2)
                  throw new InterpreterError("lambda 最少需要两个参数");

                const [paramsNode, ...exprNodes] = runtimeStack
                  .splice(-argsCount)
                  .reverse(); // runtimeStack 中的参数是倒序

                if (!is(paramsNode, "EXPR"))
                  throw new InterpreterError("lambda 参数表有误");

                operandStack.push(
                  new TreeNode(
                    "LAMBDA",
                    [
                      (op.parent?.parent?.val as number) - 1, // 实际参数的数目 ((lambda (n) n) 1)
                      paramsNode,
                      exprNodes,
                      env,
                    ],
                    op.token
                  )
                );
                break;
              case Operators.OP_IF:
                {
                  const args = runtimeStack.splice(-argsCount).reverse();
                  runtimeStack.push(new TreeNode("FOLLOW", op));
                  runtimeStack.push(args[0]);
                }
                break;
              case Operators.OP_GT:
              case Operators.OP_LT:
              case Operators.OP_EQ:
                if (argsCount !== 2) throw new InterpreterError();

                runtimeStack.splice(-argsCount, 0, new TreeNode("FOLLOW", op));
                break;
            }
          } else {
            throw new InterpreterError(`不能将此结点作为操作符`);
          }
        } else {
          throw new InterpreterError();
        }
      } else if (is(curr, "FOLLOW")) {
        const op = curr.val;

        if (is(op, "LIST")) {
          const length = op.val;
          const listNode = new TreeNode("LIST", 0, op.token);

          operandStack.push(listNode.addChildren(operandStack.splice(-length)));
        } else if (is(op, "OPERATOR")) {
          const argsCount = (op.parent as TreeNode<"EXPR">).val - 1;

          switch (op.val as Operators) {
            case Operators.OP_ADD:
              let sum = 0;

              for (const arg of operandStack.splice(-argsCount)) {
                if (is(arg, "NUMBER")) {
                  sum += arg.val;
                } else {
                  throw new InterpreterError();
                }
              }

              operandStack.push(new TreeNode("NUMBER", sum));
              break;
            case Operators.OP_IF:
              const predict = operandStack.pop() as TreeNode;

              if (!is(predict, "BOOL"))
                throw new InterpreterError("if 需要 BOOL 类型的操作数");

              const parent = op.parent as TreeNode<"EXPR">;

              if (predict.val === K_BOOL.T) {
                runtimeStack.push(parent.children[2]);
              } else {
                runtimeStack.push(
                  parent.children[3]
                    ? parent.children[3]
                    : new TreeNode("NIL", K_NIL)
                );
              }
              break;
            case Operators.OP_LT:
              const [a, b] = operandStack.splice(-2);
              if (!is(a, "NUMBER") || !is(b, "NUMBER"))
                throw new InterpreterError();

              operandStack.push(a.val < b.val ? NODE_BOOL_T : NODE_BOOL_F);
              break;
            case Operators.OP_DISPLAY:
              {
                for (const arg of operandStack.splice(-argsCount)) {
                  console.log(arg.val);
                }

                operandStack.push(NODE_NIL);
              }
              break;
          }
        } else if (is(op, "LAMBDA")) {
          const [argsCount, paramsNode, exprNodes, closureEnv] = op.val;
          const subEnv = closureEnv.extend();

          const args = operandStack.splice(-argsCount).reverse();
          const params = paramsNode.children;

          subEnv.set("#lambda", op);
          subEnv.set(
            "#args",
            new TreeNode("LIST", args.length).addChildren(args)
          );

          for (let i = 0; i < args.length; i++) {
            subEnv.set(params[i].val as string, args[i]);
          }

          const topNode = runtimeStack[runtimeStack.length - 1];

          // TCO
          if (topNode && is(topNode, "RETURN")) {
            const [resultCount, returnEnv] = topNode.val;
            for (let i = 0; i < resultCount - 1; i++) {
              operandStack.pop();
            }

            topNode.val = [exprNodes.length, returnEnv];
          } else {
            runtimeStack.push(new TreeNode("RETURN", [exprNodes.length, env]));
          }

          env = subEnv;

          for (const expr of exprNodes.reverse()) {
            runtimeStack.push(expr);
          }
        } else {
          throw new InterpreterError(`not implemented ${curr.type}`);
        }
      } else if (is(curr, "RETURN")) {
        const [resultCount, closureEnv] = curr.val;

        env = closureEnv;

        operandStack.splice(-resultCount, resultCount - 1);
      } else if (is(curr, "EXPR")) {
        const opNode = curr.children[0];

        // reverse order, after evaluation
        for (const child of curr.children.slice(1).reverse()) {
          runtimeStack.push(child);
        }

        runtimeStack.push(new TreeNode("EVAL", curr.length - 1)); // 存储的是参数的长度
        runtimeStack.push(opNode);
      } else if (is(curr, "LIST")) {
        runtimeStack.push(new TreeNode("FOLLOW", curr));

        for (const child of curr.children) {
          runtimeStack.push(child);
        }
      } else if (is(curr, "SYMBOL")) {
        const result = env.lookup(curr.val);

        if (result) {
          operandStack.push(result);
        } else {
          throw new InterpreterError(`undefined symbol ${curr.val}`);
        }
      } else {
        operandStack.push(curr);
      }
    }

    return operandStack.pop();
  }

  let returnValue;
  for (const root of roots) {
    returnValue = _interpreter(root) as TreeNode;
  }

  return returnValue;
}

function main() {
  try {
    console.log(interpreter(analysis(parser(lexer(program)))));
  } catch (e) {
    if (e instanceof ParseError) {
      console.log(`ParserError: ${e}`);
    } else if (e instanceof InterpreterError) {
      console.log(`${e}`);
      console.log(e.message);
      console.log(e.name);
      console.log(e.stack);
    } else {
      throw e;
    }
  }
}

main();
