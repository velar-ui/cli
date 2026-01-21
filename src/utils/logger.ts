import chalk from "chalk";

export const logger = {
  error: (message: string, details?: string) => {
    console.error(chalk.red("✖"), message);
    if (details) {
      console.error(chalk.gray("→"), details);
    }
  },

  success: (message: string) => {
    console.log(chalk.green("✔"), message);
  },

  warning: (message: string) => {
    console.log(chalk.yellow("⚠"), message);
  },

  info: (message: string) => {
    console.log(chalk.blue("ℹ"), message);
  },

  step: (message: string) => {
    console.log(chalk.cyan("→"), message);
  },
};
