import prompts from "prompts";
import { FileSystemService } from "@/src/services/FileSystemService";
import { InitService } from "@/src/services/InitService";
import { getBaseColors } from "@/src/utils/theme";
import { logger } from "@/src/utils/logger";
import { highlighter } from "@/src/utils/highlighter";
import type { PackageManager, VelarTheme } from "@/src/types";
import { z } from "zod";

export const initOptionsSchema = z.object({
  baseColor: z.string().optional(),
  yes: z.boolean(),
  defaults: z.boolean(),
  force: z.boolean(),
  cwd: z.string(),
  silent: z.boolean(),
});

export type InitOptions = z.infer<typeof initOptionsSchema>;

async function promptPackageManager(
  detectedPm: PackageManager,
): Promise<PackageManager> {
  const { packageManager } = await prompts(
    {
      type: "select",
      name: "packageManager",
      message: "Which package manager are you using?",
      choices: [
        { title: "npm", value: "npm" },
        { title: "yarn", value: "yarn" },
        { title: "pnpm", value: "pnpm" },
        { title: "bun", value: "bun" },
      ],
      initial: ["npm", "yarn", "pnpm", "bun"].indexOf(detectedPm),
    },
    {
      onCancel: () => {
        logger.error("Package manager selection aborted");
        process.exit(1);
      },
    },
  );

  return packageManager as PackageManager;
}

async function promptTheme(): Promise<VelarTheme> {
  const baseColors = getBaseColors();
  if (baseColors.length === 0) {
    logger.error("No base colors available.");
    process.exit(1);
  }
  const { theme } = await prompts(
    {
      type: "select",
      name: "theme",
      message: "Choose a base color theme",
      choices: baseColors.map((color) => ({
        title: color.label,
        value: color.name,
      })),
    },
    {
      onCancel: () => {
        logger.error("Theme selection aborted");
        process.exit(1);
      },
    },
  );

  return theme as VelarTheme;
}

async function promptStyleImport(): Promise<boolean> {
  const { shouldImport } = await prompts(
    {
      type: "confirm",
      name: "shouldImport",
      message: "Import Velar styles into your main CSS file?",
      initial: true,
    },
    {
      onCancel: () => false,
    },
  );

  return Boolean(shouldImport);
}

function resolveThemeFromOptions(options: InitOptions): VelarTheme | undefined {
  if (!options.baseColor) {
    return undefined;
  }

  const baseColors = getBaseColors();
  const matched = baseColors.find((color) => color.name === options.baseColor);
  if (matched) {
    return matched.name;
  }

  logger.warn(`Unknown base color "${options.baseColor}".`);
  return undefined;
}

export async function initProject(options: InitOptions): Promise<void> {
  process.chdir(options.cwd);

  const fileSystem = new FileSystemService();
  const initService = new InitService(fileSystem);

  try {
    const validation = initService.validateEnvironment();
    initService.displayEnvironmentInfo(validation);

    const packageManager = options.defaults
      ? validation.detectedPackageManager
      : await promptPackageManager(validation.detectedPackageManager);

    const baseColors = getBaseColors();
    const defaultTheme =
      baseColors.find((color) => color.name === "neutral")?.name ??
      baseColors[0]?.name;

    let theme = resolveThemeFromOptions(options);
    if (!theme) {
      theme =
        options.defaults && defaultTheme ? defaultTheme : await promptTheme();
    }

    if (!theme) {
      logger.error("No base color available.");
      process.exit(1);
    }

    await initService.createComponentsDirectory();
    await initService.createThemeFile(theme);

    let stylesImported = false;
    if (validation.cssFile && validation.canInjectCss) {
      if (options.defaults || (await promptStyleImport())) {
        await initService.injectStylesImport(validation.cssFile.path);
        stylesImported = true;
      }
    }

    await initService.generateConfig(
      {
        packageManager,
        theme,
        importStyles: stylesImported,
      },
      validation,
    );

    initService.displaySummary(
      {
        packageManager,
        theme,
        importStyles: stylesImported,
      },
      validation,
      stylesImported,
    );
  } catch (error) {
    logger.error((error as Error).message);
    if (error instanceof Error) {
      if (error.message.includes("Laravel project")) {
        logger.log("Run velar init at the root of a Laravel project");
      } else if (error.message.includes("Tailwind")) {
        logger.log(`Velar requires ${highlighter.info("Tailwind CSS v4+")}`);
      }
    }
    process.exit(1);
  }
}
