import type { VelyxComponentMeta, RegistryData } from '..'

/**
 * Interface for registry service operations
 */
export interface IRegistryService {
  /**"
   * Fetch complete registry data
   * @returns Promise resolving to registry data
   * @throws NetworkError if fetch fails
   */
  fetchRegistry(): Promise<RegistryData>

  /**
   * Fetch metadata for a specific component
   * @param name - Component name
   * @returns Promise resolving to component metadata
   * @throws ComponentNotFoundError if component doesn't exist
   * @throws NetworkError if fetch fails
   */
  fetchComponent(name: string): Promise<VelyxComponentMeta>

  /**
   * Fetch file content for a component
   * @param componentUrl - Component URL or name
   * @param path - File path within component
   * @returns Promise resolving to file content
   * @throws ComponentNotFoundError if component or file doesn't exist
   * @throws NetworkError if fetch fails
   */
  fetchFile(componentUrl: string, path: string): Promise<string>

  /**
   * Resolve component dependencies
   * @param component - Component metadata
   * @returns Promise resolving to array of components including dependencies
   */
  resolveDependencies(
    component: VelyxComponentMeta,
  ): Promise<readonly VelyxComponentMeta[]>
}
