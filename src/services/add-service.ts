import type { AddResult, RegistryData } from '@/src/types'
import type { IRegistryService, IConfigManager } from '../types/interfaces'
import { ComponentService } from './component-service'
import { FilesystemService } from './filesystem-service'
import { logger } from '../utils/logger'

/**
 * Service for handling component addition operations
 */
export class AddService {
  private readonly componentService: ComponentService

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
        new FilesystemService(),
        configManager,
      )
  }

  /**
   * Validate that Velyx is initialized
   * @throws Error if not initialized
   */
  validateInitialization(): void {
    if (!this.configManager.validate()) {
      throw new Error('Velyx is not initialized')
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
      const found = registry.components.find((c) => c.name === componentName)
      if (!found) {
        throw new Error(`Component "${componentName}" not found`)
      }
    }
  }

  /**
   * Get available components from registry
   * @returns Promise resolving to registry data
   * @throws NetworkError if fetch fails
   */
  async getAvailableComponents(): Promise<RegistryData> {
    return await this.registryService.fetchRegistry()
  }

  /**
   * Add components to the project
   * @param componentNames - Names of components to add
   * @returns Promise resolving to result of the operation
   */
  async addComponents(componentNames: readonly string[]): Promise<AddResult> {
    return await this.componentService.addComponents(componentNames)
  }

  /**
   * Display the results of adding components
   * @param result - Result of the add operation
   */
  displayResults(result: AddResult): void {
    result.added.forEach((name) => logger.success(`Added ${name}`))
    result.skipped.forEach((name) => logger.warn(`Skipped ${name}`))
    result.failed.forEach(({ name, error }) =>
      logger.error(`Failed to add ${name}: ${error}`),
    )
  }

  /**
   * Display next steps after adding components
   * @param result - Result of the add operation
   */
  displayNextSteps(result: AddResult): void {
    if (result.added.length === 0) {
      return
    }

    console.log('\n🎉 Happy coding! Enjoy building beautiful components!')

    // Check if JS files were added but not auto-imported
    const jsFiles = result.added.filter((name) => name.endsWith('.js'))
    const hasJsEntry =
      this.configManager.validate() && this.configManager.getJsEntryPath()

    if (jsFiles.length > 0 && !hasJsEntry) {
      console.log('  Import JS files in your app.js:')
      jsFiles.forEach((file) => {
        const fileName = file.split('/')[1]
        if (fileName) {
          console.log(`    import './ui/${fileName}'`)
        }
      })
    }
  }
}
