import {
  lexer,
  parser,
  analyzer,
  interpreter,
  ParserError,
  InterpreterError,
} from "./src";
import { createInterface } from "readline";
const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

// import { readFileSync } from "fs";

// const program = readFileSync("./scheme/program.ss", { encoding: "utf8" });

function evaluate(program) {
  try {
    const value = interpreter(analyzer(parser(lexer(program))));
    console.log(value);
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

  rl.question("> ", evaluate);
}

function main() {
  rl.question("> ", evaluate);
  // evaluate("10");
}

main();
