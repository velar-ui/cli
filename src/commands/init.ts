import { Command } from "commander";
import path from "path";
import { deleteFileBackup, restoreFileBackup } from "@/src/utils/file-helper";
import { initOptionsSchema, initProject } from "@/src/utils/init-project";
import { preFlightInit } from "@/src/preflights/preflight-init";

process.on("exit", (code) => {
  const filePath = path.resolve(process.cwd(), "velar.json");

  // Delete backup if successful.
  if (code === 0) {
    return deleteFileBackup(filePath);
  }

  // Restore backup if error.
  return restoreFileBackup(filePath);
});

export const init = new Command()
  .name("init")
  .description("initialize your project and install dependencies")
  .option(
    "-b, --base-color <base-color>",
    "the base color to use. (neutral, gray, zinc, stone, slate)",
    undefined,
  )
  .option("-y, --yes", "skip confirmation prompt.", true)
  .option("-d, --defaults", "use default configuration.", false)
  .option("-f, --force", "force overwrite of existing configuration.", false)
  .option(
    "-c, --cwd <cwd>",
    "the working directory. defaults to the current directory.",
    process.cwd(),
  )
  .option("-s, --silent", "mute output.", false)
  .action(async (opts) => {
    const options = initOptionsSchema.parse({
      baseColor: opts.baseColor,
      yes: Boolean(opts.yes),
      defaults: Boolean(opts.defaults),
      force: Boolean(opts.force),
      cwd: path.resolve(opts.cwd),
      silent: Boolean(opts.silent),
    });

    await initProject(options);
  });
