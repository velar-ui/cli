import { getGitHubRegistryUrl } from "./environment";
import { NetworkError, ComponentNotFoundError } from "../errors/errors";
import { HttpService } from "../services/http-service";
import type {
  GitHubFile,
  RegistryData,
  VelarComponentMeta,
} from "../types/index";

/**
 * HTTP service instance for making requests
 */
const httpService = new HttpService();

/**
 * Fetch a meta.json from a given URL and return as VelarComponentMeta
 * @param metaUrl - URL to fetch meta.json from
 * @returns Promise resolving to VelarComponentMeta
 * @throws NetworkError if fetch or parsing fails
 */
export async function fetchComponentMetaFromUrl(
  metaUrl: string,
): Promise<VelarComponentMeta> {
  try {
    const raw = await httpService.fetchText(metaUrl);

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
      const meta = await httpService.fetchJson<VelarComponentMeta>(
        file.download_url,
      );
      if (meta && Array.isArray(meta.files)) {
        return meta;
      }
      throw new NetworkError("Invalid meta.json structure");
    } catch (e) {
      if (e instanceof NetworkError) {
        throw e;
      }
      throw new NetworkError(
        `Failed to parse meta.json from ${metaUrl}: ${(e as Error).message}`,
        e as Error,
      );
    }
  } catch (error) {
    if (error instanceof NetworkError) {
      throw error;
    }
    throw new NetworkError(
      `Failed to fetch component meta from ${metaUrl}: ${(error as Error).message}`,
      error as Error,
    );
  }
}

/**
 * Fetch the GitHub registry data
 * @param branch - Git branch to fetch from (default: "main")
 * @returns Promise resolving to RegistryData
 * @throws NetworkError if fetch fails
 */
export async function fetchGitHubRegistry(
  branch: string = "main",
): Promise<RegistryData> {
  try {
    // First try to get registry.json from the root
    const registryUrl = `https://raw.githubusercontent.com/velar-ui/registry/${branch}/registry.json`;
    try {
      const registryData =
        await httpService.fetchJson<RegistryData>(registryUrl);
      return registryData;
    } catch {
      // Fallback to listing components directory
    }

    // Fallback to listing components directory
    const files = await httpService.fetchJson<GitHubFile[]>(
      `${getGitHubRegistryUrl()}/components`,
    );

    const components: VelarComponentMeta[] = [];

    for (const file of files) {
      if (file.type === "dir") {
        try {
          // Try to get meta.json for each component
          const meta = await httpService.fetchJson<VelarComponentMeta>(
            `${getGitHubRegistryUrl()}/components/${file.name}/meta.json`,
          );
          components.push({
            ...meta,
            name: file.name,
            path: file.path,
          });
        } catch {
          // Skip failed components but continue with others
          components.push({
            name: file.name,
            path: file.path,
            files: [],
          });
        }
      }
    }

    return { components };
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

/**
 * Fetch component metadata from GitHub
 * @param componentName - Name of the component to fetch
 * @returns Promise resolving to GitHubFile
 * @throws ComponentNotFoundError if component doesn't exist
 * @throws NetworkError if fetch fails
 */
export async function fetchComponent(
  componentName: string,
): Promise<GitHubFile> {
  try {
    const metaUrl = `${getGitHubRegistryUrl()}/components/${componentName}/meta.json`;
    const response = await httpService.fetch(metaUrl);

    if (response.status === 404) {
      throw new ComponentNotFoundError(componentName);
    }

    if (!response.ok) {
      throw new NetworkError(
        `Component meta not found: ${response.status} ${response.statusText}`,
      );
    }

    return await httpService.fetchJson<GitHubFile>(metaUrl);
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

/**
 * Fetch a component file content from GitHub
 * @param componentName - Name of the component
 * @param filePath - Path to the file within the component directory
 * @returns Promise resolving to file content as string
 * @throws ComponentNotFoundError if component or file doesn't exist
 * @throws NetworkError if fetch fails
 */
export async function fetchComponentFile(
  componentName: string,
  filePath: string,
): Promise<string> {
  try {
    const fileUrl = `${getGitHubRegistryUrl()}/components/${componentName}/${filePath}`;
    const response = await httpService.fetch(fileUrl);

    if (response.status === 404) {
      throw new ComponentNotFoundError(componentName);
    }

    if (!response.ok) {
      throw new NetworkError(
        `File not found: ${response.status} ${response.statusText}`,
      );
    }

    const file = await httpService.fetchJson<GitHubFile>(fileUrl);

    if (!file.download_url) {
      throw new NetworkError("File has no download URL");
    }

    return await httpService.fetchText(file.download_url);
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
