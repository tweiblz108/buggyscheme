import { Token } from "./types";

export class LexerError extends Error {}

export function lexer(program: string) {
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

  if (a !== b) {
    tokens.push(new Token(program.substring(a, b), row, a - columnDec + 1));
  }

  // remove comments
  return tokens.filter(({ str }) => !str.startsWith(";"));
}
