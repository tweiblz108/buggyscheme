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
import { readFileSync } from "fs";

const program = readFileSync("./program.ss", { encoding: "utf8" });

type Pos = [number, number, string];

function Pos(row: number, column: number, filename: string = "__main__"): Pos {
  return [row, column, filename];
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
      pos: [row, column],
    } = this;

    return `${row}:${column} ${str}`;
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
}

const Constants = [
  ":number",
  ":string",
  ":char",
  ":bool",
  ":list",
  ":lambda",
  ":nil",
  ":type",
  "#t",
  "#f",
  "#nil",
  "#lambda",
  "#args",
];

type a = typeof Constants;

type NTypeContainer = "EXPR" | "LIST";
type NTypeAtom =
  | "SYMBOL"
  | "NUMBER"
  | "LAMBDA"
  | "BOOL"
  | "STRING"
  | "CHAR"
  | "TYPE";
type NTypeOperator = "OPERATOR";
type NTypeConstant = "CONSTANT";
type NTypeInternal = "UNKNOWN" | "EVAL" | "PRIMITIVE" | "RETURN";
type NType =
  | NTypeContainer
  | NTypeAtom
  | NTypeOperator
  | NTypeConstant
  | NTypeInternal;

class TreeNode {
  token?: Token;
  parent: TreeNode | null = null;
  children: TreeNode[] = [];
  bundle?: TreeNode | Env;

  constructor(public type: NType, public val: any = "") {}

  withToken(token: Token | undefined) {
    this.token = token;

    return this;
  }

  withBundle(bundle: TreeNode | Env) {
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

  isRoot() {
    return this.parent === null;
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
          const pos = Pos(row, a - columnDec + 1);
          const token = new Token(program.substring(a, b), pos);

          tokens.push(token);
          a = b;
        }

        switch (c) {
          case "(":
          case ")":
          case "[":
          case "]":
            const pos = Pos(row, a - columnDec + 1);
            const token = new Token(c, pos);

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
          const pos = Pos(row, a - columnDec + 1);
          const token = new Token(program.substring(a, b + 1), pos);

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
        const pos = Pos(row, a - columnDec + 1);
        const token = new Token(program.substring(a, b + 1), pos);

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
      if (c === "\n" || b + 1 === program.length) {
        const pos = Pos(row, a - columnDec + 1);
        const token = new Token(program.substring(a, b), pos);

        tokens.push(token);
        a = b; // let normal mode handle \n
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

  for (const [i, token] of tokens.entries()) {
    const { str } = token;
    const parent = parents.length > 0 ? parents[parents.length - 1] : null;

    if (str === "(") {
      parents.push(new TreeNode("EXPR", 0).withToken(token));

      if (parent) parent.addChild(parents[parents.length - 1]);
    } else if (str === "[") {
      parents.push(new TreeNode("LIST", 0).withToken(token));

      if (parent) parent.addChild(parents[parents.length - 1]);
    } else if (str === ")") {
      const node = parents.pop();

      if (!node || node.type !== "EXPR") {
        throw new ParseError(token);
      } else {
        if (node.isRoot()) {
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
        if (node.isRoot()) {
          roots.push(node);
        } else {
          // nothing
        }
      }
    } else {
      const node = new TreeNode("UNKNOWN", str).withToken(token);
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
  constructor(message: string = "") {
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

        if (Object.values(Constants).includes(val)) {
          node.type = "CONSTANT";
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

  function _interpreter(root: TreeNode) {
    runtimeStack.push(root);

    while (runtimeStack.length > 0) {
      const curr = runtimeStack.pop() as TreeNode;

      if (curr.type === "EVAL") {
        if (operandStack.length > 0) {
          const op = operandStack.pop() as TreeNode;

          if (op.type === "LAMBDA") {
            const argsCount = (curr.bundle! as TreeNode).parent!.val - 1;
            const paramsCount = op.val;

            if (argsCount === paramsCount) {
              const paramsNode = op.children[0];

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
            op.type as NTypeOperator;

            const argsCount = op.parent!.val - 1;

            switch (op.val as Operators) {
              case Operators.OP_ADD:
                runtimeStack.splice(
                  -argsCount,
                  0,
                  new TreeNode("PRIMITIVE").withBundle(op)
                );
                break;
              case Operators.OP_LAMBDA:
                if (argsCount !== 2) throw new InterpreterError("lambda");

                const args = runtimeStack.splice(-argsCount);
                operandStack.push(
                  new TreeNode("LAMBDA", args[0].val)
                    .addChildren(args)
                    .withBundle(env)
                );
            }
          }
        } else {
          throw new InterpreterError();
        }
      } else if (curr.type === "PRIMITIVE") {
        const op = curr.bundle as TreeNode;

        if (op.type === "LIST") {
          const length = <number>op.val;
          const listNode = new TreeNode("LIST", curr.children.length).withToken(
            op.token
          );

          for (const listItem of operandStack.splice(-length)) {
            listNode.addChild(listItem);
          }

          operandStack.push(listNode);
        } else if (op.type === "OPERATOR") {
          switch (op.val as Operators) {
            case Operators.OP_ADD:
              const argsCount = op.parent!.val;
              let sum = 0;

              for (const arg of operandStack.splice(-argsCount)) {
                if (arg.type !== "NUMBER") {
                  throw new InterpreterError();
                } else {
                  sum += arg.val;
                }
              }

              operandStack.push(new TreeNode("NUMBER", sum));
              break;
          }
        } else if (op.type === "LAMBDA") {
          const argsCount = op.val;
          const [paramsNode, ...exprNodes] = op.children;
          const _env = op.bundle as Env;
          const env0 = _env.extend();

          const args = operandStack.splice(-argsCount).reverse();
          const params = paramsNode.children;

          for (let i = 0; i < args.length; i++) {
            env0.set(params[i].val, args[i]);
          }

          runtimeStack.push(
            new TreeNode("RETURN", exprNodes.length).withBundle(env)
          );

          env = env0;

          for (const expr of exprNodes.reverse()) {
            runtimeStack.push(expr);
          }
        } else {
          throw new InterpreterError(`not implemented ${curr.type}`);
        }
      } else if (curr.type === "RETURN") {
        const resultCount = curr.val;

        env = curr.bundle as Env;
        operandStack.splice(-resultCount, resultCount - 1);
      } else if (curr.type === "EXPR") {
        const opNode = curr.children[0];

        for (let i = 1; i < curr.children.length; i++) {
          runtimeStack.push(curr.children[i]);
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
