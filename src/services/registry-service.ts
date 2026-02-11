import type { GitHubFile, RegistryData, VelyxComponentMeta } from '../types'
import type { IRegistryService } from '../types/interfaces'
import {
  fetchComponent,
  fetchComponentFile,
  fetchGitHubRegistry,
} from '../utils/remote-registry'

import { HttpService } from './http-service'

import { spinner } from '../utils/spinner'

/**
 * Service for interacting with the Velyx component registry
 */
export class RegistryService implements IRegistryService {
  private readonly httpService: HttpService

  /**
   * Create a new RegistryService instance
   * @param httpService - Optional HTTP service instance (creates new one if not provided)
   */
  constructor(httpService?: HttpService) {
    this.httpService = httpService ?? new HttpService()
  }

  /**
   * Fetch the complete registry data
   * @returns Promise resolving to registry data
   * @throws NetworkError if fetch fails
   */
  async fetchRegistry(): Promise<RegistryData> {
    return await spinner.withTask(
      'Fetching registry...',
      () => fetchGitHubRegistry(),
      undefined,
      'Failed to fetch registry',
    )
  }

  /**
   * Fetch metadata for a specific component
   * @param name - Component name
   * @returns Promise resolving to component metadata
   * @throws ComponentNotFoundError if component doesn't exist
   * @throws NetworkError if fetch fails
   */
  async fetchComponent(name: string): Promise<VelyxComponentMeta> {
    const file = await spinner.withTask(
      `Fetching component "${name}" metadata...`,
      () => fetchComponent(name),
      undefined,
      `Failed to fetch component "${name}"`,
    )
    return await this.parseComponentMeta(file)
  }

  /**
   * Fetch file content for a component
   * @param componentUrl - Component URL or name
   * @param path - File path within component
   * @returns Promise resolving to file content
   * @throws ComponentNotFoundError if component or file doesn't exist
   * @throws NetworkError if fetch fails
   */
  async fetchFile(componentUrl: string, path: string): Promise<string> {
    const componentName = componentUrl.split('/').pop() || componentUrl
    return await spinner.withTask(
      `Downloading ${path}...`,
      () => fetchComponentFile(componentName, path),
      undefined,
      `Failed to fetch file "${path}"`,
    )
  }

  /**
   * Resolve component dependencies
   * @param component - Component metadata
   * @returns Promise resolving to array of components including dependencies
   */
  async resolveDependencies(
    component: VelyxComponentMeta,
  ): Promise<readonly VelyxComponentMeta[]> {
    const visited = new Set<string>()
    const resolved: VelyxComponentMeta[] = []

    const resolve = async (comp: VelyxComponentMeta) => {
      if (visited.has(comp.name)) return
      visited.add(comp.name)
      resolved.push(comp)

      // Component dependencies would be resolved here if they exist
      // For now, just add the component itself
    }

    await resolve(component)
    return resolved
  }

  /**
   * Parse component metadata from GitHub file
   * @param file - GitHub file metadata
   * @returns Promise resolving to component metadata
   * @throws NetworkError if download or parsing fails
   */
  private async parseComponentMeta(
    file: GitHubFile,
  ): Promise<VelyxComponentMeta> {
    if (!file.download_url) {
      throw new Error('GitHub file has no download URL')
    }

    try {
      const raw = await this.httpService.fetchText(file.download_url)
      return JSON.parse(raw) as VelyxComponentMeta
    } catch (error) {
      throw new Error(
        `Failed to parse component meta: ${(error as Error).message}`,
      )
    }
  }
}
