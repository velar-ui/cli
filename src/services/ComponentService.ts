import type {
  AddResult,
  VelarComponentMeta,
  FailedComponent,
} from "../types/index.js";
import type { IRegistryService } from "../types/interfaces.js";
import type { IFileSystemService } from "../types/interfaces.js";
import type { IConfigManager } from "../types/interfaces.js";
import * as p from "@clack/prompts";
import path from "path";
import { logger } from "../utils/logger.js";
import { FileSystemService } from "./FileSystemService.js";
import { injectComponentJs } from "../utils/js.js";

/**
 * Service for managing component operations
 */
export class ComponentService {
  private readonly fileSystem: IFileSystemService;

  /**
   * Create a new ComponentService instance
   * @param registryService - Service for registry operations
   * @param fileSystem - Optional file system service (creates new one if not provided)
   * @param configManager - Service for configuration management
   */
  constructor(
    private readonly registryService: IRegistryService,
    fileSystem?: IFileSystemService,
    private readonly configManager?: IConfigManager,
  ) {
    this.fileSystem = fileSystem ?? new FileSystemService();
    if (!this.configManager) {
      throw new Error("ConfigManager is required");
    }
  }

  /**
   * Add multiple components to the project
   * @param componentNames - Array of component names to add
   * @returns Promise resolving to result of the operation
   */
  async addComponents(componentNames: readonly string[]): Promise<AddResult> {
    const result: {
      added: string[];
      skipped: string[];
      failed: FailedComponent[];
    } = {
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

  /**
   * Add a single component to the project
   * @param componentName - Name of the component to add
   * @returns Promise resolving to result of the operation
   * @throws Error if component fetch fails
   */
  private async addComponent(componentName: string): Promise<AddResult> {
    const result: {
      added: string[];
      skipped: string[];
      failed: FailedComponent[];
    } = {
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
    const componentsPath = this.configManager!.getComponentsPath();

    for (const comp of componentsToAdd) {
      // Process all files (blade, js, css)
      for (const file of comp.files) {
        const content = await this.registryService.fetchFile(
          comp.name,
          file.path,
        );

        // Determine destination based on file type
        const dest = this.getDestinationPath(comp, file, componentsPath);

        // Check if file exists and handle conflict
        if (await this.fileSystem.fileExists(dest)) {
          const action = await this.handleFileConflict(file.path);
          if (action === "skip") {
            result.skipped.push(`${comp.name}/${file.path}`);
            continue;
          } else if (action === "cancel") {
            logger.error("Cancelled.");
            process.exit(0);
          }
        }

        // Write the file
        try {
          await this.fileSystem.writeFile(dest, content);
          result.added.push(`${comp.name}/${file.path}`);

          // Handle JS auto-import
          if (file.type === "js") {
            await this.autoImportJs(comp.name);
          }
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

  /**
   * Automatically import component JS into the main JS entry
   * @param componentName - Name of the component
   */
  private async autoImportJs(componentName: string): Promise<void> {
    try {
      const jsEntry = this.configManager?.getJsEntryPath();
      if (!jsEntry || !(await this.fileSystem.fileExists(jsEntry))) {
        return;
      }

      const importPath = `./ui/${componentName}`;
      injectComponentJs(jsEntry, componentName, importPath);
      logger.success(`Auto-imported ${componentName} into ${jsEntry}`);
    } catch (error) {
      logger.warning(
        `Failed to auto-import JS for ${componentName}: ${
          (error as Error).message
        }`,
      );
    }
  }

  /**
   * Get the destination path for a component file
   * @param component - Component metadata
   * @param file - File metadata
   * @param componentsPath - Base components path
   * @returns Destination file path
   */
  private getDestinationPath(
    component: VelarComponentMeta,
    file: { type: string; path: string },
    componentsPath: string,
  ): string {
    switch (file.type) {
      case "blade":
        return path.join(componentsPath, `${component.name}.blade.php`);
      case "js":
        return path.join("resources/js/ui", `${component.name}.js`);
      case "css":
        return path.join("resources/css/components", `${component.name}.css`);
      default:
        return path.join(componentsPath, file.path);
    }
  }

  /**
   * Handle file conflict by prompting user
   * @param filePath - Path of the conflicting file
   * @returns Promise resolving to user action ("skip", "overwrite", or "cancel")
   */
  private async handleFileConflict(
    filePath: string,
  ): Promise<"skip" | "overwrite" | "cancel"> {
    const action = await p.select({
      message: `File "${filePath}" already exists. What do you want to do?`,
      options: [
        { label: "Skip", value: "skip" },
        { label: "Overwrite", value: "overwrite" },
        { label: "Cancel", value: "cancel" },
      ],
      initialValue: "skip",
    });

    if (p.isCancel(action)) {
      return "cancel";
    }

    return action as "skip" | "overwrite" | "cancel";
  }
}
