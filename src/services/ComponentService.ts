import type { AddResult } from "../types/index.js";
import type { RegistryService } from "./RegistryService.js";
import type { FileSystemService } from "./FileSystemService.js";
import type { ConfigManager } from "../config/ConfigManager.js";
import prompts from "prompts";
import path from "path";
import { logger } from "../utils/logger.js";

export class ComponentService {
  constructor(
    private registryService: RegistryService,
    private fileSystem: FileSystemService,
    private configManager: ConfigManager,
  ) {}

  async addComponents(componentNames: string[]): Promise<AddResult> {
    const result: AddResult = {
      added: [],
      skipped: [],
      failed: [],
    };

    for (const componentName of componentNames) {
      try {
        const componentResult = await this.addComponent(componentName);
        result.added.push(...componentResult.added);
        result.skipped.push(...componentResult.skipped);
        result.failed.push(...componentResult.failed);
      } catch (error) {
        result.failed.push({
          name: componentName,
          error: (error as Error).message,
        });
      }
    }

    return result;
  }

  private async addComponent(componentName: string): Promise<AddResult> {
    const result: AddResult = {
      added: [],
      skipped: [],
      failed: [],
    };

    // Fetch component metadata
    const component = await this.registryService.fetchComponent(componentName);

    // Resolve dependencies
    const componentsToAdd =
      await this.registryService.resolveDependencies(component);

    // Get components path
    const componentsPath = this.configManager.getComponentsPath();

    for (const comp of componentsToAdd) {
      // Process all files (blade, js, css)
      for (const file of comp.files) {
        const content = await this.registryService.fetchFile(
          comp.name,
          file.path,
        );

        // Determine destination based on file type
        let dest: string;
        switch (file.type) {
          case "blade":
            dest = path.join(componentsPath, `${comp.name}.blade.php`);
            break;
          case "js":
            dest = path.join("resources/js/components", `${comp.name}.js`);
            break;
          case "css":
            dest = path.join("resources/css/components", `${comp.name}.css`);
            break;
          default:
            dest = path.join(componentsPath, file.path);
        }

        // Check if file exists and handle conflict
        if (await this.fileSystem.fileExists(dest)) {
          const res = await prompts({
            type: "select",
            name: "action",
            message: `⚠ File "${file.path}" already exists.\nWhat do you want to do?`,
            choices: [
              { title: "Skip", value: "skip" },
              { title: "Overwrite", value: "overwrite" },
              { title: "Cancel", value: "cancel" },
            ],
            initial: 0,
          });

          if (res.action === "skip") {
            result.skipped.push(`${comp.name}/${file.path}`);
            continue;
          } else if (res.action === "cancel") {
            logger.error("Cancelled.");
            process.exit(0);
          }
        }

        // Write the file
        try {
          await this.fileSystem.writeFile(dest, content);
          result.added.push(`${comp.name}/${file.path}`);
        } catch (error) {
          result.failed.push({
            name: `${comp.name}/${file.path}`,
            error: (error as Error).message,
          });
        }
      }
    }

    return result;
  }
}
