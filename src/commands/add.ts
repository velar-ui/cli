#!/usr/bin/env node
import { Command } from "commander";
import prompts from "prompts";

import { ComponentService } from "../services/ComponentService.js";
import { RegistryService } from "../services/RegistryService.js";
import { FileSystemService } from "../services/FileSystemService.js";
import { ConfigManager } from "../config/ConfigManager.js";
import { ErrorHandler } from "../errors/ErrorHandler.js";
import { logger } from "../utils/logger.js";

export default function registerAddCommand(program: Command) {
  program
    .command("add")
    .argument("[components...]", "Names of components to add")
    .description("Add one or more UI components to your Laravel project")
    .action(async (components?: string[]) => {
      const errorHandler = new ErrorHandler();

      try {
        // Initialize services
        const configManager = new ConfigManager();
        await configManager.load();

        const fileSystem = new FileSystemService();
        const registryService = new RegistryService();
        const componentService = new ComponentService(
          registryService,
          fileSystem,
          configManager,
        );

        // Validate configuration
        if (!configManager.validate()) {
          logger.error("Velar is not initialized");
          logger.step("Run velar init first");
          process.exit(1);
        }

        // Load registry
        const registry = await registryService.fetchRegistry();

        // If no components provided, prompt for selection
        if (!components || components.length === 0) {
          const available = registry.components.map((c) => c.name);
          const res = await prompts({
            type: "multiselect",
            name: "selected",
            message: "Select components to add",
            choices: available.map((c: string) => ({ title: c, value: c })),
            min: 1,
          });

          if (!res.selected || res.selected.length === 0) {
            logger.warning("No component selected");
            process.exit(0);
          }
          components = res.selected as string[];
        }

        // Validate components exist
        for (const component of components) {
          if (!registry.components.find((c) => c.name === component)) {
            logger.error(`Component "${component}" not found`);
            logger.step("Run velar list to see available components");
            process.exit(1);
          }
        }

        // Add components
        const result = await componentService.addComponents(components);

        // Display results
        result.added.forEach((name: string) => logger.success("Added " + name));
        result.skipped.forEach((name: string) =>
          logger.warning("Skipped " + name),
        );
        result.failed.forEach(
          ({ name, error }: { name: string; error: string }) =>
            logger.error("Failed to add " + name + ": " + error),
        );

        if (result.added.length > 0) {
          console.log("\nNext steps:");
          console.log("  Use <x-ui.COMPONENT> in your Blade views");

          // Check if JS files were added
          const jsFiles = result.added.filter((name: string) =>
            name.endsWith(".js"),
          );
          if (jsFiles.length > 0) {
            console.log("  Import JS files in your app.js:");
            jsFiles.forEach((file: string) =>
              console.log(`    import './components/${file.split("/")[1]}'`),
            );
          }
        }
      } catch (error) {
        errorHandler.handle(error as Error, "add command");
      }
    });
}
