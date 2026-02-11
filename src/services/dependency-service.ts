import { exec } from 'child_process'
import { promisify } from 'util'
import type { PackageManager, VelyxDependency } from '@/src/types'
import type { IDependencyService } from '@/src/types/interfaces'
import { logger } from '@/src/utils/logger'
import { FilesystemService } from './filesystem-service'

const execAsync = promisify(exec)

/**
 * Convert npm-style dependency string to Composer format
 * @param dep - Dependency string in npm format (e.g., "vendor/package@1.0.0")
 * @returns Dependency string in Composer format (e.g., "vendor/package:1.0.0")
 */
function convertNpmToComposerFormat(dep: string): string {
  // Replace @ with : for version constraint
  // But only if it's not a scoped package (starting with @)
  if (dep.startsWith('@')) {
    // Scoped npm package like @alpinejs/alpinejs - return as-is for npm
    return dep
  }
  // Replace @ with : for Composer packages
  return dep.replace('@', ':')
}

/**
 * Service for managing dependency installation
 */
export class DependencyService implements IDependencyService {
  private readonly fileSystem: FilesystemService

  constructor(fileSystem?: FilesystemService) {
    this.fileSystem = fileSystem ?? new FilesystemService()
  }

  /**
   * Install component dependencies using appropriate package managers
   * @param dependencies - Dependencies to install
   * @param packageManager - Package manager to use for npm dependencies
   * @returns Promise that resolves when installation is complete
   */
  async installDependencies(
    dependencies: VelyxDependency,
    packageManager: PackageManager,
  ): Promise<void> {
    const npmPromises = []
    const composerPromises = []

    // Install npm dependencies
    if (dependencies.npm && dependencies.npm.length > 0) {
      npmPromises.push(
        this.installNpmDependencies(dependencies.npm, packageManager),
      )
    }

    // Install composer dependencies
    if (dependencies.composer && dependencies.composer.length > 0) {
      composerPromises.push(
        this.installComposerDependencies(dependencies.composer),
      )
    }

    // Execute installations in parallel
    await Promise.allSettled([...npmPromises, ...composerPromises])
  }

  /**
   * Install npm/yarn/pnpm/bun dependencies
   * @param dependencies - Array of dependency strings (e.g., "alpinejs@^3.14.0")
   * @param packageManager - Package manager to use
   * @returns Promise that resolves when installation is complete
   */
  async installNpmDependencies(
    dependencies: readonly string[],
    packageManager: PackageManager,
  ): Promise<void> {
    if (!this.fileSystem.fileExists('package.json')) {
      logger.warn('No package.json found, skipping npm dependencies')
      return
    }

    const missingDeps = await this.filterMissingNpmDependencies(dependencies)

    if (missingDeps.length === 0) {
      logger.info('All npm dependencies already installed')
      return
    }

    const command = this.getNpmInstallCommand(packageManager, missingDeps)

    try {
      logger.info(`Installing npm dependencies: ${missingDeps.join(', ')}`)

      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 120000, // 2 minutes timeout
      })

      if (stdout && process.env.NODE_ENV !== 'test') {
        console.log(stdout)
      }

      if (stderr && !stderr.includes('WARN')) {
        logger.warn(`npm install warnings: ${stderr}`)
      }

      logger.success(`Installed ${missingDeps.length} npm dependencies`)
    } catch (error) {
      logger.error(
        `Failed to install npm dependencies: ${(error as Error).message}`,
      )
      throw error
    }
  }

  /**
   * Install composer dependencies
   * @param dependencies - Array of dependency strings (e.g., "livewire/livewire:^3.0" or "livewire/livewire@^3.0")
   * @returns Promise that resolves when installation is complete
   */
  async installComposerDependencies(
    dependencies: readonly string[],
  ): Promise<void> {
    if (!this.fileSystem.fileExists('composer.json')) {
      logger.warn('No composer.json found, skipping composer dependencies')
      return
    }

    // Convert npm format (@) to Composer format (:) if needed
    const convertedDeps = dependencies.map(convertNpmToComposerFormat)

    const missingDeps =
      await this.filterMissingComposerDependencies(convertedDeps)

    if (missingDeps.length === 0) {
      logger.info('All composer dependencies already installed')
      return
    }

    try {
      logger.info(`Installing composer dependencies: ${missingDeps.join(', ')}`)

      const { stdout, stderr } = await execAsync(
        `composer require ${missingDeps.join(' ')}`,
        {
          cwd: process.cwd(),
          timeout: 300000, // 5 minutes timeout for composer
        },
      )

      if (stdout && process.env.NODE_ENV !== 'test') {
        console.log(stdout)
      }

      if (stderr) {
        logger.warn(`composer require warnings: ${stderr}`)
      }

      logger.success(`Installed ${missingDeps.length} composer dependencies`)
    } catch (error) {
      logger.error(
        `Failed to install composer dependencies: ${(error as Error).message}`,
      )
      throw error
    }
  }

  /**
   * Get the appropriate npm install command based on package manager
   * @param packageManager - Package manager to use
   * @param dependencies - Dependencies array
   * @returns Command string
   */
  private getNpmInstallCommand(
    packageManager: PackageManager,
    dependencies: readonly string[],
  ): string {
    switch (packageManager) {
      case 'pnpm':
        return `pnpm add ${dependencies.join(' ')}`
      case 'yarn':
        return `yarn add ${dependencies.join(' ')}`
      case 'bun':
        return `bun add ${dependencies.join(' ')}`
      case 'npm':
      default:
        return `npm install ${dependencies.join(' ')}`
    }
  }

  /**
   * Filter out npm dependencies that are already installed
   * @param dependencies - Dependencies to check
   * @returns Array of missing dependencies
   */
  private async filterMissingNpmDependencies(
    dependencies: readonly string[],
  ): Promise<string[]> {
    try {
      const { stdout } = await execAsync('npm list --json --depth=0', {
        cwd: process.cwd(),
        timeout: 30000,
      })

      const installed = JSON.parse(stdout) as Record<string, any>
      const installedDeps = Object.keys({
        ...installed.dependencies,
        ...installed.devDependencies,
      })

      return dependencies.filter((dep) => {
        const name = dep.split('@')[0]
        return !installedDeps.includes(name)
      })
    } catch {
      // If we can't check, assume all need to be installed
      return dependencies as string[]
    }
  }

  /**
   * Filter out composer dependencies that are already installed
   * @param dependencies - Dependencies to check
   * @returns Array of missing dependencies
   */
  private async filterMissingComposerDependencies(
    dependencies: readonly string[],
  ): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        'composer show --installed --format=json',
        {
          cwd: process.cwd(),
          timeout: 30000,
        },
      )

      const installed = JSON.parse(stdout) as {
        installed: Array<{ name: string }>
      }
      const installedDeps = installed.installed.map((pkg) => pkg.name)

      return dependencies.filter((dep) => {
        const name = dep.split(':')[0]
        return !installedDeps.includes(name)
      })
    } catch {
      // If we can't check, assume all need to be installed
      return dependencies as string[]
    }
  }
}
