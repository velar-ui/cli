import path from "path";
import fs from "fs-extra";
import { highlighter } from "@/src/utils/highlighter";
import { logger } from "@/src/utils/logger";
import { spinner } from "@/src/utils/spinner";
import prompts from "prompts";
import type { InitOptions } from "@/src/utils/init-project";

export interface ProjectInfo {
  name: string;
  framework: {
    name: string;
    label: string;
    version?: string;
  };
  hasAlpine: boolean;
  hasLivewire: boolean;
  hasVite: boolean;
  paths: {
    views: string;
    assets: string;
    public: string;
    config: string;
  };
}

export async function getProjectInfo(cwd: string): Promise<ProjectInfo | null> {
  try {
    const composerPath = path.resolve(cwd, "composer.json");
    const packagePath = path.resolve(cwd, "package.json");

    // Vérifier si c'est un projet Laravel
    if (!fs.existsSync(composerPath)) {
      return null;
    }

    const composer = await fs.readJson(composerPath);
    const isLaravel =
      composer.require?.["laravel/framework"] ||
      composer.require?.["illuminate/foundation"];

    if (!isLaravel) {
      return null;
    }

    const projectInfo: ProjectInfo = {
      name: composer.name || path.basename(cwd),
      framework: {
        name: "laravel",
        label: "Laravel",
        version: composer.require?.["laravel/framework"] || "unknown",
      },
      hasAlpine: false,
      hasLivewire: false,
      hasVite: false,
      paths: {
        views: "resources/views",
        assets: "resources/js",
        public: "public",
        config: "config",
      },
    };

    // Vérifier les dépendances frontend
    if (fs.existsSync(packagePath)) {
      const pkg = await fs.readJson(packagePath);
      projectInfo.hasAlpine = !!(
        pkg.dependencies?.alpinejs || pkg.devDependencies?.alpinejs
      );
      projectInfo.hasLivewire = !!(
        pkg.dependencies?.livewire || pkg.devDependencies?.livewire
      );
      projectInfo.hasVite = !!pkg.devDependencies?.vite;
    }

    // Vérifier la structure des dossiers
    const viewsPath = path.resolve(cwd, "resources/views");
    const assetsPath = path.resolve(cwd, "resources/js");

    if (fs.existsSync(viewsPath)) {
      projectInfo.paths.views = "resources/views";
    }

    if (fs.existsSync(assetsPath)) {
      projectInfo.paths.assets = "resources/js";
    }

    return projectInfo;
  } catch {
    return null;
  }
}

export async function preFlightInit(options: InitOptions): Promise<{
  errors: Record<string, boolean>;
  projectInfo: ProjectInfo | null;
}> {
  const errors: Record<string, boolean> = {};

  // Vérifier si le répertoire existe
  if (!fs.existsSync(options.cwd)) {
    errors["MISSING_DIR"] = true;
    return { errors, projectInfo: null };
  }

  const projectSpinner = spinner.start("Checking project environment...");

  // Vérifier si velar.json existe déjà
  const velarConfigPath = path.resolve(options.cwd, "velar.json");
  if (fs.existsSync(velarConfigPath) && !options.force) {
    projectSpinner.fail();
    logger.break();

    const { action } = await prompts({
      type: "select",
      name: "action",
      message: `A ${highlighter.info("velar.json")} file already exists. What would you like to do?`,
      choices: [
        {
          title: "Re-initialize Velar configuration",
          value: "reinit",
        },
        {
          title: "Keep existing configuration",
          value: "keep",
        },
        {
          title: "Exit",
          value: "exit",
        },
      ],
      initial: 0,
    });

    if (action === "exit") {
      logger.log("Operation cancelled.");
      process.exit(0);
    }

    if (action === "keep") {
      logger.log("Keeping existing configuration.");
      process.exit(0);
    }

    // Continue with re-initialization
    logger.log(`Re-initializing Velar configuration...`);
  }

  // Récupérer les infos du projet
  const projectInfo = await getProjectInfo(options.cwd);

  if (!projectInfo || projectInfo.framework.name !== "laravel") {
    errors["UNSUPPORTED_PROJECT"] = true;
    projectSpinner.fail();
    logger.break();
    logger.error(
      `We could not detect a supported Laravel project at ${highlighter.info(
        options.cwd,
      )}.\nVelar is designed to work with Laravel projects.`,
    );
    logger.break();
    process.exit(1);
  }

  projectSpinner.succeed(
    `Found ${highlighter.info(projectInfo.framework.label)} project`,
  );

  // Vérifier Alpine.js
  const alpineSpinner = spinner.start("Checking Alpine.js...");

  if (!projectInfo.hasAlpine) {
    errors["ALPINE_MISSING"] = true;
    alpineSpinner.fail();
  } else {
    alpineSpinner.succeed("Alpine.js found");
  }

  // Vérifier Vite (recommandé pour Velar)
  const viteSpinner = spinner.start("Checking build tools...");

  if (!projectInfo.hasVite) {
    logger.warn(
      `Vite not found. Using Vite is recommended for better development experience.`,
    );
    viteSpinner.warn("Vite not found (but optional)");
  } else {
    viteSpinner.succeed("Vite found");
  }

  // Afficher les erreurs bloquantes
  if (Object.keys(errors).length > 0) {
    if (errors["ALPINE_MISSING"]) {
      logger.break();
      logger.error(`Alpine.js is required but not found in your project.`);
      logger.error(
        `Install Alpine.js with: ${highlighter.info("npm install alpinejs")}`,
      );
      logger.break();
    }

    logger.break();
    process.exit(1);
  }

  return { errors, projectInfo };
}
