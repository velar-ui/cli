import type { PackageManager, VelyxDependency } from '..'

/**
 * Interface for dependency installation operations
 */
export interface IDependencyService {
  /**
   * Install component dependencies using appropriate package managers
   * @param dependencies - Dependencies to install
   * @param packageManager - Package manager to use for npm dependencies
   * @returns Promise that resolves when installation is complete
   */
  installDependencies(
    dependencies: VelyxDependency,
    packageManager: PackageManager,
  ): Promise<void>

  /**
   * Install npm/yarn/pnpm/bun dependencies
   * @param dependencies - Array of dependency strings (e.g., "alpinejs@^3.14.0")
   * @param packageManager - Package manager to use
   * @returns Promise that resolves when installation is complete
   */
  installNpmDependencies(
    dependencies: readonly string[],
    packageManager: PackageManager,
  ): Promise<void>

  /**
   * Install composer dependencies
   * @param dependencies - Array of dependency strings (e.g., "livewire/livewire:^3.0")
   * @returns Promise that resolves when installation is complete
   */
  installComposerDependencies(dependencies: readonly string[]): Promise<void>
}
