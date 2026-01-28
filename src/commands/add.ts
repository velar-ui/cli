#!/usr/bin/env node
import { ErrorHandler } from "@/src/errors/ErrorHandler";
import { addComponents } from "@/src/utils/add-components";
import { Command } from "commander";
import { z } from "zod";
import path from "path";

export const addOptionsSchema = z.object({
  components: z.array(z.string()).optional(),
  yes: z.boolean(),
  overwrite: z.boolean(),
  cwd: z.string(),
  all: z.boolean(),
  path: z.string().optional(),
  silent: z.boolean(),
  srcDir: z.boolean().optional(),
  cssVariables: z.boolean().optional(),
});

/**
 * Register the 'add' command with the CLI program
 * @param program - Commander program instance
 */
export const add = new Command()
  .name("add")
  .argument("[components...]", "Names of components to add")
  .option("-y, --yes", "skip confirmation prompt.", false)
  .option("-o, --overwrite", "overwrite existing files.", false)
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option("-a, --all", "add all available components", false)
  .option("-p, --path <path>", "the path to add the component to.")
  .option("-s, --silent", "mute output.", false)
  .option(
    "--src-dir",
    "use the src directory when creating a new project.",
    false,
  )
  .option(
    "--no-src-dir",
    "do not use the src directory when creating a new project.",
  )
  .option("--css-variables", "use CSS variables for theming.", true)
  .option("--no-css-variables", "do not use CSS variables for theming.")
  .description("Add one or more UI components to your Laravel project")
  .action(async (components, opts) => {
    const errorHandler = new ErrorHandler();

    try {
      const rawOptions = {
        components,
        cwd: path.resolve(opts.cwd),
        ...opts,
        cssVariables: opts.cssVariables ?? true,
      };

      const options = addOptionsSchema.parse(rawOptions);
      await addComponents(options);
    } catch (error) {
      errorHandler.handle(error as Error, "add command");
      process.exit(1);
    }
  });
