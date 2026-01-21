import chalk from "chalk";

export class RegistryError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = "RegistryError";
  }
}

export class NetworkError extends RegistryError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = "NetworkError";
  }
}

export class ComponentNotFoundError extends RegistryError {
  constructor(componentName: string, cause?: Error) {
    super(`Component "${componentName}" not found`, cause);
    this.name = "ComponentNotFoundError";
  }
}

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
