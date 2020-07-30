import {
  lexer,
  parser,
  analyzer,
  interpreter,
  ParserError,
  InterpreterError,
} from "./src";

import { readFileSync } from "fs";

const program = readFileSync("./scheme/program.ss", { encoding: "utf8" });

function main() {
  try {
    console.log(interpreter(analyzer(parser(lexer(program)))));
  } catch (e) {
    if (e instanceof ParserError) {
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
