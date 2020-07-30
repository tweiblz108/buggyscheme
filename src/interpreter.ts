import { Env, TreeNode, K_BOOL, K_NIL, Operators } from "./types";
import { is } from "./helpers";

export class InterpreterError extends Error {
  constructor(message = "") {
    super(message);
  }
}

export function interpreter(roots: TreeNode[]): TreeNode {
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

          operandStack.push(
            listNode.addChildren(operandStack.splice(-length).reverse())
          );
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
