import { Command } from "commander";
import prompts from "prompts";
import { isLaravelProject } from "../utils/laravel.js";
import { readPackageJson, detectTailwindV4 } from "../utils/tailwind.js";
import {
  findMainCss,
  hasTailwindImport,
  ensureDir,
  injectVelarImport,
} from "../utils/css.js";
import { THEMES, copyTheme } from "../utils/theme.js";
import { writeVelarConfig } from "../utils/config.js";
import fs from "fs";
import { logger } from "../utils/errors.js";

export default function registerInitCommand(program: Command) {
  program
    .command("init")
    .description("Initialize Velar in a Laravel project")
    .action(async () => {
      // 1. Laravel detection
      if (!isLaravelProject()) {
        console.error("✖ No Laravel project detected.");
        console.error("→ Run velar init at the root of a Laravel project.");
        process.exit(1);
      }

      // 2. Tailwind v4 detection
      const pkg = readPackageJson();
      if (!pkg || !detectTailwindV4(pkg)) {
        console.error("✖ Tailwind CSS v4 was not detected.");
        console.error("→ Velar requires Tailwind CSS v4+.");
        process.exit(1);
      }

      // 3. Find main CSS
      const css = findMainCss();
      const hasCss = Boolean(css);
      const canInject = css ? hasTailwindImport(css.content) : false;

      if (!hasCss) {
        console.warn("⚠ No main CSS file found.");
        console.warn("→ Styles will be created but not auto-imported.");
      } else if (!canInject) {
        console.warn("⚠ Tailwind import not found in CSS.");
        console.warn("→ Velar styles will not be auto-imported.");
      }

      // 4. Choose theme
      const themePrompt = await prompts({
        type: "select",
        name: "theme",
        message: "Choose a base color theme",
        choices: THEMES.map((t) => ({
          title: t.charAt(0).toUpperCase() + t.slice(1),
          value: t,
        })),
        initial: 0,
      });

      const theme = themePrompt.theme;
      if (!theme) {
        console.log("✖ Theme selection aborted.");
        process.exit(1);
      }

      // 5. Create UI directory
      const uiDir = "resources/views/components/ui";
      ensureDir(uiDir);

      // 6. Create velar.css from theme
      const velarCssPath = "resources/css/velar.css";
      ensureDir(velarCssPath.split("/").slice(0, -1).join("/"));

      if (!hasCss || !css) {
        // fallback: always create if not present
        try {
          copyTheme(theme, velarCssPath);
          console.log("✔ Velar theme created at:");
          console.log("  resources/css/velar.css");
        } catch (e) {
          console.error((e as Error).message);
          process.exit(1);
        }
      } else if (!fs.existsSync(velarCssPath)) {
        try {
          copyTheme(theme, velarCssPath);
          console.log("✔ Velar theme created at:");
          console.log("  resources/css/velar.css");
        } catch (e) {
          console.error((e as Error).message);
          process.exit(1);
        }
      } else {
        console.log("✔ velar.css already exists.");
      }

      // 7. Inject import if possible
      let importDone = false;
      if (hasCss && canInject) {
        const res = await prompts({
          type: "confirm",
          name: "import",
          message: "Import Velar styles into your main CSS file?",
          initial: true,
        });

        if (res.import) {
          injectVelarImport(css!.path);
          importDone = true;
          console.log("✔ Velar styles imported into:");
          console.log(`  ${css!.path}`);
        }
      }

      // 8. Generate velar.json config
      const config = {
        version: "0.1",
        theme,
        css: {
          entry: hasCss ? css!.path : "",
          velar: "resources/css/velar.css",
        },
        components: {
          path: "resources/views/components/ui",
        },
      };
      writeVelarConfig(config);
      console.log("✔ velar.json config generated");

      // 9. Summary
      console.log("\n---");
      logger.success("Laravel project detected");
      logger.success("Tailwind CSS v4 detected");
      logger.success(`Theme selected: ${theme}`);
      logger.success("UI components directory ready");
      logger.success(
        importDone ? "Styles import complete" : "Styles import pending",
      );
      logger.success("velar.json created");
      console.log("\nNext steps:");
      console.log("  velar add button");
      // Suggest tweakcn.com for advanced color customization (at the end)
      console.log(
        "\n💡 Want to customize your Tailwind palette? Try https://tweakcn.com/ — a visual generator for Tailwind-compatible color scales.",
      );
    });
}
