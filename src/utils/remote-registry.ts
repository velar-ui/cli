import { getGitHubRegistryUrl } from "./environment.js";
import { NetworkError, ComponentNotFoundError } from "./errors.js";
import type {
  GitHubFile,
  RegistryData,
  VelarComponentMeta,
} from "../types/index.js";
/**
 * Fetch a meta.json from a given URL and return as VelarComponentMeta
 */
export async function fetchComponentMetaFromUrl(
  metaUrl: string,
): Promise<VelarComponentMeta> {
  const response = await fetch(metaUrl);
  if (!response.ok) {
    throw new NetworkError(`Component meta not found: ${response.status}`);
  }
  const raw = await response.text();
  // Try to parse as VelarComponentMeta directly (raw JSON)
  try {
    const meta = JSON.parse(raw) as VelarComponentMeta;
    if (meta && Array.isArray(meta.files)) {
      return meta;
    }
  } catch {
    // Fallback to next logic
  }
  // If not, try as GitHubFile (API response)
  try {
    const file = JSON.parse(raw) as GitHubFile;
    if (!file.download_url) {
      throw new NetworkError("GitHubFile missing download_url");
    }
    const metaResponse = await fetch(file.download_url);
    if (!metaResponse.ok) {
      throw new NetworkError(
        `Failed to download meta.json content: ${metaResponse.status}`,
      );
    }
    const meta = (await metaResponse.json()) as VelarComponentMeta;
    if (meta && Array.isArray(meta.files)) {
      return meta;
    }
    throw new NetworkError("Invalid meta.json structure");
  } catch (e) {
    throw new NetworkError(
      `Failed to parse meta.json from ${metaUrl}: ${(e as Error).message}`,
      e as Error,
    );
  }
}

export async function fetchGitHubRegistry(
  branch: string = "main",
): Promise<RegistryData> {
  try {
    // First try to get registry.json from the root
    const registryUrl = `https://raw.githubusercontent.com/velar-ui/registry/${branch}/registry.json`;
    const response = await fetch(registryUrl);

    if (response.ok) {
      const registryData = (await response.json()) as RegistryData;
      return registryData;
    }

    // Fallback to listing components directory
    const componentsResponse = await fetch(
      `${getGitHubRegistryUrl()}/components`,
    );

    if (!componentsResponse.ok) {
      throw new NetworkError(
        `GitHub API error: ${componentsResponse.status} ${componentsResponse.statusText}`,
      );
    }

    const files = (await componentsResponse.json()) as GitHubFile[];
    const registry: RegistryData = { components: [] };

    for (const file of files) {
      if (file.type === "dir") {
        try {
          // Try to get meta.json for each component
          const metaResponse = await fetch(
            `${getGitHubRegistryUrl()}/components/${file.name}/meta.json`,
          );
          if (metaResponse.ok) {
            const meta = (await metaResponse.json()) as VelarComponentMeta;
            registry.components.push({
              ...meta,
              name: file.name,
              path: file.path,
            });
          } else {
            // Fallback with basic info
            registry.components.push({
              name: file.name,
              path: file.path,
              files: [],
            });
          }
        } catch {
          // Skip failed components but continue with others
          registry.components.push({
            name: file.name,
            path: file.path,
            files: [],
          });
        }
      }
    }

    return registry;
  } catch (error) {
    if (error instanceof NetworkError) {
      throw error;
    }
    throw new NetworkError(
      `Failed to fetch remote registry: ${(error as Error).message}`,
      error as Error,
    );
  }
}

export async function fetchComponent(
  componentName: string,
): Promise<GitHubFile> {
  try {
    const metaUrl = `${getGitHubRegistryUrl()}/components/${componentName}/meta.json`;
    const response = await fetch(metaUrl);

    if (!response.ok) {
      if (response.status === 404) {
        throw new ComponentNotFoundError(componentName);
      }
      throw new NetworkError(`Component meta not found: ${response.status}`);
    }

    const content = (await response.json()) as GitHubFile;
    return content;
  } catch (error) {
    if (
      error instanceof ComponentNotFoundError ||
      error instanceof NetworkError
    ) {
      throw error;
    }
    throw new NetworkError(
      `Failed to fetch component meta for "${componentName}": ${(error as Error).message}`,
      error as Error,
    );
  }
}

export async function fetchComponentFile(
  componentName: string,
  filePath: string,
): Promise<string> {
  try {
    const fileUrl = `${getGitHubRegistryUrl()}/components/${componentName}/${filePath}`;
    const response = await fetch(fileUrl);

    if (!response.ok) {
      if (response.status === 404) {
        throw new ComponentNotFoundError(componentName);
      }
      throw new NetworkError(`File not found: ${response.status}`);
    }

    const file = (await response.json()) as GitHubFile;

    if (!file.download_url) {
      throw new NetworkError("File has no download URL");
    }

    const contentResponse = await fetch(file.download_url);
    if (!contentResponse.ok) {
      throw new NetworkError(
        `Failed to download file content: ${contentResponse.status}`,
      );
    }

    return await contentResponse.text();
  } catch (error) {
    if (
      error instanceof ComponentNotFoundError ||
      error instanceof NetworkError
    ) {
      throw error;
    }
    throw new NetworkError(
      `Failed to fetch file "${filePath}" for component "${componentName}": ${(error as Error).message}`,
      error as Error,
    );
  }
}
