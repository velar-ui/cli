import prompts from "prompts";
import path from "path";
import fsExtra from "fs-extra";
import type {
  AddResult,
  FailedComponent,
  VelarComponentFile,
  VelarComponentMeta,
} from "@/src/types";
import type {
  IConfigManager,
  IFileSystemService,
  IRegistryService,
} from "@/src/types/interfaces";
import { FilesystemService } from "@/src/services/filesystem-service";
import { injectComponentJs } from "@/src/utils/js";
import { logger } from "@/src/utils/logger";
import {
  createFileBackup,
  deleteFileBackup,
  restoreFileBackup,
} from "@/src/utils/file-helper";

type PlannedFile = {
  componentName: string;
  filePath: string;
  fileType: string;
  destPath: string;
  content: string;
  existedBefore: boolean;
};

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
    this.fileSystem = fileSystem ?? new FilesystemService();
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

    const plannedFiles: PlannedFile[] = [];

    for (const comp of componentsToAdd) {
      for (const file of comp.files) {
        // Determine destination based on file type
        const dest = this.getDestinationPath(comp, file, componentsPath);

        // Check if file exists and handle conflict
        const existedBefore = await this.fileSystem.fileExists(dest);
        if (existedBefore) {
          const action = await this.handleFileConflict(file.path);
          if (action === "skip") {
            result.skipped.push(`${comp.name}/${file.path}`);
            continue;
          } else if (action === "cancel") {
            logger.error("Cancelled.");
            process.exit(0);
          }
        }

        const content = await this.registryService.fetchFile(
          comp.name,
          file.path,
        );

        plannedFiles.push({
          componentName: comp.name,
          filePath: file.path,
          fileType: file.type,
          destPath: dest,
          content,
          existedBefore,
        });
      }
    }

    if (plannedFiles.length > 0) {
      try {
        await this.applyFileBatch(plannedFiles);
        plannedFiles.forEach((file) =>
          result.added.push(`${file.componentName}/${file.filePath}`),
        );

        const jsComponents = new Set(
          plannedFiles
            .filter((file) => file.fileType === "js")
            .map((file) => file.componentName),
        );
        for (const jsComponent of Array.from(jsComponents)) {
          await this.autoImportJs(jsComponent);
        }
      } catch (error) {
        plannedFiles.forEach((file) =>
          result.failed.push({
            name: `${file.componentName}/${file.filePath}`,
            error: (error as Error).message,
          }),
        );
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
      logger.warn(
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
    file: VelarComponentFile,
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
    const { action } = await prompts(
      {
        type: "select",
        name: "action",
        message: `File "${filePath}" already exists. What do you want to do?`,
        choices: [
          { title: "Skip", value: "skip" },
          { title: "Overwrite", value: "overwrite" },
          { title: "Cancel", value: "cancel" },
        ],
        initial: 0,
      },
      {
        onCancel: () => {
          logger.error("Cancelled.");
          process.exit(0);
        },
      },
    );

    return action as "skip" | "overwrite" | "cancel";
  }

  private async applyFileBatch(plannedFiles: PlannedFile[]): Promise<void> {
    const tempFiles: string[] = [];
    const backupTargets: string[] = [];

    try {
      for (const file of plannedFiles) {
        const tempPath = `${file.destPath}.velar-tmp`;
        await this.fileSystem.writeFile(tempPath, file.content);
        tempFiles.push(tempPath);
      }

      for (const file of plannedFiles) {
        if (!file.existedBefore) {
          continue;
        }

        const backupPath = createFileBackup(file.destPath);
        if (!backupPath) {
          throw new Error(`Failed to create backup for ${file.destPath}`);
        }
        backupTargets.push(file.destPath);
      }

      for (const file of plannedFiles) {
        const tempPath = `${file.destPath}.velar-tmp`;
        await fsExtra.move(tempPath, file.destPath, { overwrite: true });
      }

      backupTargets.forEach((filePath) => deleteFileBackup(filePath));
    } catch (error) {
      for (const file of plannedFiles) {
        if (await this.fileSystem.fileExists(file.destPath)) {
          await fsExtra.remove(file.destPath);
        }
        if (file.existedBefore) {
          restoreFileBackup(file.destPath);
        }
      }

      for (const tempFile of tempFiles) {
        if (await this.fileSystem.fileExists(tempFile)) {
          await fsExtra.remove(tempFile);
        }
      }

      throw error;
    }
  }
}
