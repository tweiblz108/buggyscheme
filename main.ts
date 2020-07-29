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

enum Constants {
  K_TYPE_NUMBER = ":number",
  K_TYPE_STRING = ":string",
  K_TYPE_CHAR = ":char",
  K_TYPE_BOOL = ":bool",
  K_TYPE_LIST = ":list",
  K_TYPE_LAMBDA = ":lambda",
  K_TYPE_NIL = ":nil",
  K_TYPE_TYPE = ":type",
  K_BOOL_T = "#t",
  K_BOOL_F = "#f",
  K_NIL = "#nil",
}

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
type NTypeInternal = "UNKNOWN" | "EVAL" | "PRIMITIVE" | "RETURN";
type NType = NTypeContainer | NTypeAtom | NTypeInternal;

class TreeNode {
  parent: TreeNode | null = null;
  children: TreeNode[] = [];

  bundle?: TreeNode;

  constructor(
    public type: NType,
    public val: string | number = "",
    public token?: Token,
    public env?: Env
  ) {}

  withBundle(bundle: TreeNode) {
    this.bundle = bundle;

    return this;
  }

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
    const c = program[b];

    if (currMode === "normal") {
      if (["(", ")", "[", "]", " ", "\n", ";"].includes(c)) {
        if (a !== b) {
          const token = new Token(
            program.substring(a, b),
            row,
            a - columnDec + 1
          );

          tokens.push(token);
          a = b;
        }

        switch (c) {
          case "(":
          case ")":
          case "[":
          case "]":
            const token = new Token(c, row, a - columnDec + 1);

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
            }[c] as "char" | "string" | "comment";
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
      if (c === '"') {
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
      } else if (c === "\n") {
        throw new LexerError();
      } else if (b + 1 === program.length) {
        throw new LexerError();
      } else {
        b += 1;
      }
    } else if (currMode === "char") {
      if (c === "'") {
        const token = new Token(
          program.substring(a, b + 1),
          row,
          a - columnDec + 1
        );

        tokens.push(token);
        b += 1;
        a = b;
        currMode = "normal";
      } else if (c === "\n") {
        throw new LexerError();
      } else if (b + 1 === program.length) {
        throw new LexerError();
      } else {
        b += 1;
      }
    } else if (currMode === "comment") {
      if (c === "\n") {
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
      const a = 1 + 2;
      console.log(a);
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

  for (const [, token] of tokens.entries()) {
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

      if (node.type === "EXPR" || node.type === "LIST") {
        node.val = node.children.length;

        for (const child of node.children) {
          stack.push(child);
        }
      } else {
        const val = node.val as string;

        if (Object.values(Constants).includes(val as Constants)) {
          switch (val as Constants) {
            case Constants.K_BOOL_F:
            case Constants.K_BOOL_T:
              node.type = "BOOL";
              break;
            case Constants.K_NIL:
              node.type = "NIL";
            default:
              node.type = "TYPE";
          }
        } else if (Object.values(Operators).includes(val as Operators)) {
          node.type = "OPERATOR";
        } else if (REGEXP_NUMBER.test(val)) {
          node.type = "NUMBER";
          node.val = parseFloat(val);
        } else if (val.startsWith('"') && val.endsWith('"')) {
          node.type = "STRING";
          node.val = val.slice(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          node.type = "CHAR";
          node.val = val.slice(1, val.length - 1);

          if (node.val.length > 1) throw new AnalysisError();
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

  const NODE_BOOL_T = new TreeNode("BOOL", Constants.K_BOOL_T);
  const NODE_BOOL_F = new TreeNode("BOOL", Constants.K_BOOL_F);
  const NODE_NIL = new TreeNode("NIL", Constants.K_NIL);

  function _interpreter(root: TreeNode) {
    runtimeStack.push(root);

    while (runtimeStack.length > 0) {
      const curr = runtimeStack.pop() as TreeNode;

      if (curr.type === "EVAL") {
        if (operandStack.length > 0) {
          const op = operandStack.pop() as TreeNode;

          if (op.type === "LAMBDA") {
            const argsCount = (op.bundle!.parent!.parent!.val as number) - 1;
            const paramsCount = op.val;

            if (argsCount === paramsCount) {
              const paramsNode = op.bundle!.parent!.children[1];

              for (const child of paramsNode.children) {
                if (child.type !== "SYMBOL") throw new InterpreterError();
              }

              runtimeStack.splice(
                -argsCount,
                0,
                new TreeNode("PRIMITIVE").withBundle(op)
              );
            } else {
              throw new InterpreterError();
            }
          } else {
            const argsCount = (op.parent!.val as number) - 1;

            switch (op.val as Operators) {
              case Operators.OP_DISPLAY:
              case Operators.OP_ADD:
                runtimeStack.splice(
                  -argsCount,
                  0,
                  new TreeNode("PRIMITIVE").withBundle(op)
                );
                break;
              case Operators.OP_LAMBDA:
                if (argsCount < 2) throw new InterpreterError("lambda");

                runtimeStack.splice(-argsCount);
                operandStack.push(
                  new TreeNode(
                    "LAMBDA",
                    op.parent!.children[1].val,
                    op.token,
                    env
                  ).withBundle(op)
                );
                break;
              case Operators.OP_IF:
                {
                  const args = runtimeStack.splice(-argsCount).reverse();
                  runtimeStack.push(new TreeNode("PRIMITIVE").withBundle(op));
                  runtimeStack.push(args[0]);
                }
                break;
              case Operators.OP_GT:
              case Operators.OP_LT:
              case Operators.OP_EQ:
                if (argsCount !== 2) throw new InterpreterError();

                runtimeStack.splice(
                  -argsCount,
                  0,
                  new TreeNode("PRIMITIVE").withBundle(op)
                );
                break;
            }
          }
        } else {
          throw new InterpreterError();
        }
      } else if (curr.type === "PRIMITIVE") {
        const op = curr.bundle as TreeNode;

        if (op.type === "LIST") {
          const length = op.val as number;
          const listNode = new TreeNode("LIST", 0, op.token);

          operandStack.push(listNode.addChildren(operandStack.splice(-length)));
        } else if (op.type === "OPERATOR") {
          const argsCount = (op.parent!.val as number) - 1;

          switch (op.val as Operators) {
            case Operators.OP_ADD:
              let sum = 0;

              for (const arg of operandStack.splice(-argsCount)) {
                if (arg.type !== "NUMBER") {
                  throw new InterpreterError();
                } else {
                  sum += arg.val as number;
                }
              }

              operandStack.push(new TreeNode("NUMBER", sum));
              break;
            case Operators.OP_IF:
              const predict = operandStack.pop() as TreeNode;

              if (predict.type !== "BOOL")
                throw new InterpreterError("if need bool");

              if (predict.val === Constants.K_BOOL_T) {
                runtimeStack.push(op.parent!.children[2]);
              } else {
                runtimeStack.push(
                  op.parent!.children[3]
                    ? op.parent!.children[3]
                    : new TreeNode("NIL", Constants.K_NIL)
                );
              }
              break;
            case Operators.OP_LT:
              const [a, b] = operandStack.splice(-2);
              if (a.type !== "NUMBER" || b.type !== "NUMBER")
                throw new InterpreterError();

              operandStack.push(
                a.val < b.val
                  ? new TreeNode("BOOL", Constants.K_BOOL_T)
                  : new TreeNode("BOOL", Constants.K_BOOL_F)
              );
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
        } else if (op.type === "LAMBDA") {
          const argsCount = op.val as number;
          const [paramsNode, ...exprNodes] = op.bundle!.parent!.children.slice(
            1
          );
          const _env = op.env as Env;
          const env0 = _env.extend();

          const args = operandStack.splice(-argsCount).reverse();
          const params = paramsNode.children;

          env0.set("#lambda", op);
          env0.set("#args", new TreeNode("LIST").addChildren(args));

          for (let i = 0; i < args.length; i++) {
            env0.set(params[i].val as string, args[i]);
          }

          const top = runtimeStack[runtimeStack.length - 1];

          // TCO
          if (top && top.type === "RETURN") {
            for (let i = 0; i < (top.val as number) - 1; i++) {
              operandStack.pop();
            }

            top.val = exprNodes.length;
          } else {
            runtimeStack.push(
              new TreeNode(
                "RETURN",
                exprNodes.length,
                undefined,
                env
              ).withBundle(op)
            );
          }

          env = env0;

          for (const expr of exprNodes.reverse()) {
            runtimeStack.push(expr);
          }
        } else {
          throw new InterpreterError(`not implemented ${curr.type}`);
        }
      } else if (curr.type === "RETURN") {
        const resultCount = curr.val as number;

        env = curr.env as Env;
        operandStack.splice(-resultCount, resultCount - 1);
      } else if (curr.type === "EXPR") {
        const opNode = curr.children[0];

        // reverse order, after evaluation
        for (const child of curr.children.slice(1).reverse()) {
          runtimeStack.push(child);
        }

        runtimeStack.push(new TreeNode("EVAL").withBundle(curr));
        runtimeStack.push(opNode);
      } else if (curr.type === "LIST") {
        runtimeStack.push(new TreeNode("PRIMITIVE").withBundle(curr));

        for (const child of curr.children) {
          runtimeStack.push(child);
        }
      } else if (curr.type === "SYMBOL") {
        const result = env.lookup(<string>curr.val);

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
