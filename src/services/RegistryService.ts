import type {
  VelarComponentMeta,
  RegistryData,
  GitHubFile,
} from "../types/index.js";
import {
  fetchGitHubRegistry,
  fetchComponent,
  fetchComponentFile,
} from "../utils/remote-registry.js";
import { logger } from "../utils/errors.js";

export class RegistryService {
  async fetchRegistry(): Promise<RegistryData> {
    try {
      return await fetchGitHubRegistry();
    } catch (error) {
      logger.error("Failed to fetch registry");
      throw error;
    }
  }

  async fetchComponent(name: string): Promise<VelarComponentMeta> {
    try {
      const file = await fetchComponent(name);
      return await this.parseComponentMeta(file);
    } catch (error) {
      logger.error(`Failed to fetch component "${name}"`);
      throw error;
    }
  }

  async fetchFile(componentUrl: string, path: string): Promise<string> {
    try {
      const componentName = componentUrl.split("/").pop() || componentUrl;
      return await fetchComponentFile(componentName, path);
    } catch (error) {
      logger.error(
        `Failed to fetch file "${path}" for component "${componentUrl}"`,
      );
      throw error;
    }
  }

  async resolveDependencies(
    component: VelarComponentMeta,
  ): Promise<VelarComponentMeta[]> {
    const visited = new Set<string>();
    const resolved: VelarComponentMeta[] = [];

    const resolve = async (comp: VelarComponentMeta) => {
      if (visited.has(comp.name)) return;
      visited.add(comp.name);
      resolved.push(comp);

      // Component dependencies would be resolved here if they exist
      // For now, just add the component itself
    };

    await resolve(component);
    return resolved;
  }

  private async parseComponentMeta(
    file: GitHubFile,
  ): Promise<VelarComponentMeta> {
    const response = await fetch(file.download_url!);
    const raw = await response.text();
    return JSON.parse(raw) as VelarComponentMeta;
  }
}
