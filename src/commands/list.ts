import { Command } from "commander";
import { z } from "zod";
import path from "path";
import { listComponents } from "@/src/utils/list-components";
import { ErrorHandler } from "@/src/errors/ErrorHandler";

const listOptionsSchema = z.object({
  cwd: z.string(),
  query: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  json: z.boolean(),
});

export const list = new Command()
  .name("list")
  .alias("search")
  .description("List or search components from the registry")
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option("-q, --query <query>", "query string")
  .option(
    "-l, --limit <number>",
    "maximum number of items to display",
    undefined,
  )
  .option("-o, --offset <number>", "number of items to skip", undefined)
  .option("--json", "output JSON", false)
  .action(async (opts) => {
    const errorHandler = new ErrorHandler();

    try {
      const options = listOptionsSchema.parse({
        cwd: path.resolve(opts.cwd),
        query: opts.query,
        limit: opts.limit ? Number.parseInt(opts.limit, 10) : undefined,
        offset: opts.offset ? Number.parseInt(opts.offset, 10) : undefined,
        json: Boolean(opts.json),
      });

      process.chdir(options.cwd);
      await listComponents(options);
    } catch (error) {
      errorHandler.handle(error as Error, "list command");
      process.exit(1);
    }
  });
