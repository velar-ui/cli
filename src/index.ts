import chalk from "chalk";
import { Command } from "commander";
import { init } from "@/src/commands/init";
import { add } from "@/src/commands/add";
import { list } from "@/src/commands/list";

import packageJson from "../package.json";
/**
 * Display a nice introduction banner
 */
function displayIntro(): void {
  console.log("");
  console.log(chalk.bold.cyan(`  ▼ VELAR CLI v${packageJson.version}`));
  console.log(chalk.gray("  Tailwind CSS v4+ components for Laravel"));
  console.log("");
}

/**
 * Velar CLI program entry point
 */
const program = new Command();
program
  .name("velar")
  .description("Velar CLI: Copy UI components into your Laravel project")
  .version(
    packageJson.version || "1.0.0",
    "-v, --version",
    "display the version number",
  )
  .hook("preAction", () => {
    displayIntro();
  });

program
  .addCommand(add)
  .addCommand(init)
  .addCommand(list);

program.parse(process.argv);
