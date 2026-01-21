import { Command } from "commander";
import registerInitCommand from "./commands/init.js";
import registerAddCommand from "./commands/add.js";
import registerListCommand from "./commands/list.js";

const program = new Command();
program
  .name("velar")
  .description("Velar CLI: Copy UI components into your Laravel project")
  .version("0.1.0");

registerInitCommand(program);
registerAddCommand(program);
registerListCommand(program);

program.parse(process.argv);
