import { Command } from "commander";
import prompts from "prompts";
import { isLaravelProject } from "../utils/laravel.js";
import { readPackageJson, detectTailwindV4 } from "../utils/tailwind.js";
import {
  hasAlpineJs,
  hasLivewire,
  hasInteractivitySupport,
} from "../utils/requirements.js";
import {
  findMainCss,
  hasTailwindImport,
  injectVelarImport,
} from "../utils/css.js";
import { THEMES, copyTheme } from "../utils/theme.js";
import { writeVelarConfig } from "../utils/config.js";
import fs from "fs";
import { logger } from "../utils/errors.js";
import { FileSystemService } from "../services/FileSystemService.js";

export default function registerInitCommand(program: Command) {
  program
    .command("init")
    .description("Initialize Velar in a Laravel project")
    .action(async () => {
      const fileSystem = new FileSystemService();
      // 1. Laravel detection
      if (!isLaravelProject()) {
        logger.error("No Laravel project detected");
        logger.step("Run velar init at the root of a Laravel project");
        process.exit(1);
      }

      // 2. Interactivity detection (Alpine.js/Livewire)
      const hasAlpine = hasAlpineJs();
      const hasLivewireSupport = hasLivewire();

      if (!hasInteractivitySupport()) {
        logger.warning("No interactivity framework detected");
        logger.step("Velar components work best with Alpine.js or Livewire");
        logger.step("Install Alpine.js: npm install alpinejs");
        logger.step("Or install Livewire: composer require livewire/livewire");
      } else if (hasAlpine) {
        logger.success(
          "Alpine.js detected - components will be fully interactive",
        );
      } else if (hasLivewireSupport) {
        logger.success(
          "Livewire detected - components will work with Livewire",
        );
      }

      // 3. Tailwind v4 detection
      const pkg = readPackageJson();
      if (!pkg || !detectTailwindV4(pkg)) {
        logger.error("Tailwind CSS v4 was not detected");
        logger.step("Velar requires Tailwind CSS v4+");
        process.exit(1);
      }

      // 4. Find main CSS
      const css = findMainCss();
      const hasCss = Boolean(css);
      const canInject = css ? hasTailwindImport(css.content) : false;

      if (!hasCss) {
        logger.warning("No main CSS file found");
        logger.step("Styles will be created but not auto-imported");
      } else if (!canInject) {
        logger.warning("Tailwind import not found in CSS");
        logger.step("Velar styles will not be auto-imported");
      }

      // 5. Choose theme
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
        logger.error("Theme selection aborted");
        process.exit(1);
      }

      // 6. Create UI directory
      const uiDir = "resources/views/components/ui";
      await fileSystem.ensureDir(uiDir);

      // 7. Create velar.css from theme
      const velarCssPath = "resources/css/velar.css";
      await fileSystem.ensureDir(
        velarCssPath.split("/").slice(0, -1).join("/"),
      );

      if (!hasCss || !css) {
        // fallback: always create if not present
        try {
          copyTheme(theme, velarCssPath);
          logger.success("Velar theme created");
          logger.info("resources/css/velar.css");
        } catch (e) {
          logger.error((e as Error).message);
          process.exit(1);
        }
      } else if (!fs.existsSync(velarCssPath)) {
        try {
          copyTheme(theme, velarCssPath);
          logger.success("Velar theme created");
          logger.info("resources/css/velar.css");
        } catch (e) {
          logger.error((e as Error).message);
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
