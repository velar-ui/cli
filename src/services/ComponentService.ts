import type { AddResult } from "../types/index.js";
import type { RegistryService } from "./RegistryService.js";
import type { FileSystemService } from "./FileSystemService.js";
import type { ConfigManager } from "../config/ConfigManager.js";
import prompts from "prompts";
import path from "path";

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
      // Process Blade files only for now
      const bladeFiles = comp.files.filter((f) => f.type === "blade");

      for (const file of bladeFiles) {
        const content = await this.registryService.fetchFile(
          comp.name,
          file.path,
        );
        const dest = path.join(componentsPath, `${comp.name}.blade.php`);

        // Check if file exists and handle conflict
        if (await this.fileSystem.fileExists(dest)) {
          const res = await prompts({
            type: "select",
            name: "action",
            message: `⚠ Component "${comp.name}" already exists.\nWhat do you want to do?`,
            choices: [
              { title: "Skip", value: "skip" },
              { title: "Overwrite", value: "overwrite" },
              { title: "Cancel", value: "cancel" },
            ],
            initial: 0,
          });

          if (res.action === "skip") {
            result.skipped.push(comp.name);
            continue;
          } else if (res.action === "cancel") {
            console.log("✖ Cancelled.");
            process.exit(0);
          }
        }

        // Write the file
        try {
          await this.fileSystem.writeFile(dest, content);
          result.added.push(comp.name);
        } catch (error) {
          result.failed.push({
            name: comp.name,
            error: (error as Error).message,
          });
        }
      }
    }

    return result;
  }
}
