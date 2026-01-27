import type { AddResult, RegistryData } from "../types/index";
import type { IRegistryService } from "../types/interfaces";
import type { IConfigManager } from "../types/interfaces";
import { ComponentService } from "./ComponentService";
import { FileSystemService } from "./FileSystemService";
import { logger } from "../utils/logger";

/**
 * Service for handling component addition operations
 */
export class AddService {
  private readonly componentService: ComponentService;

  /**
   * Create a new AddService instance
   * @param registryService - Service for registry operations
   * @param configManager - Service for configuration management
   * @param componentService - Optional component service (creates new one if not provided)
   */
  constructor(
    private readonly registryService: IRegistryService,
    private readonly configManager: IConfigManager,
    componentService?: ComponentService,
  ) {
    // ComponentService will be created if not provided
    // This allows for dependency injection in tests
    this.componentService =
      componentService ??
      new ComponentService(
        registryService,
        new FileSystemService(),
        configManager,
      );
  }

  /**
   * Validate that Velar is initialized
   * @throws Error if not initialized
   */
  validateInitialization(): void {
    if (!this.configManager.validate()) {
      throw new Error("Velar is not initialized");
    }
  }

  /**
   * Validate that components exist in the registry
   * @param componentNames - Names of components to validate
   * @param registry - Registry data
   * @throws Error if any component is not found
   */
  validateComponents(
    componentNames: readonly string[],
    registry: RegistryData,
  ): void {
    for (const componentName of componentNames) {
      const found = registry.components.find((c) => c.name === componentName);
      if (!found) {
        throw new Error(`Component "${componentName}" not found`);
      }
    }
  }

  /**
   * Get available components from registry
   * @returns Promise resolving to registry data
   * @throws NetworkError if fetch fails
   */
  async getAvailableComponents(): Promise<RegistryData> {
    return await this.registryService.fetchRegistry();
  }

  /**
   * Add components to the project
   * @param componentNames - Names of components to add
   * @returns Promise resolving to result of the operation
   */
  async addComponents(componentNames: readonly string[]): Promise<AddResult> {
    return await this.componentService.addComponents(componentNames);
  }

  /**
   * Display the results of adding components
   * @param result - Result of the add operation
   */
  displayResults(result: AddResult): void {
    result.added.forEach((name) => logger.success(`Added ${name}`));
    result.skipped.forEach((name) => logger.warn(`Skipped ${name}`));
    result.failed.forEach(({ name, error }) =>
      logger.error(`Failed to add ${name}: ${error}`),
    );
  }

  /**
   * Display next steps after adding components
   * @param result - Result of the add operation
   */
  displayNextSteps(result: AddResult): void {
    if (result.added.length === 0) {
      return;
    }

    console.log("\nNext steps:");
    console.log("  Use <x-ui.COMPONENT> in your Blade views");

    // Check if JS files were added but not auto-imported
    const jsFiles = result.added.filter((name) => name.endsWith(".js"));
    const hasJsEntry = this.configManager.validate() && this.configManager.getJsEntryPath();

    if (jsFiles.length > 0 && !hasJsEntry) {
      console.log("  Import JS files in your app.js:");
      jsFiles.forEach((file) => {
        const fileName = file.split("/")[1];
        if (fileName) {
          console.log(`    import './ui/${fileName}'`);
        }
      });
    }
  }
}
