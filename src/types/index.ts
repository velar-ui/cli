export type VelarFileType = "blade" | "js" | "css";

export interface VelarComponentFile {
  type: VelarFileType;
  path: string;
}

export interface VelarDependency {
  composer?: string[];
  npm?: string[];
}

export interface VelarComponentMeta {
  name: string;
  description?: string;
  categories?: string[];
  files: VelarComponentFile[];
  dependencies?: VelarDependency;
  path: string;
}

export interface RegistryData {
  components: VelarComponentMeta[];
}

export interface VelarConfig {
  version: string;
  theme: string;
  packageManager: string;
  css: {
    entry: string;
    velar: string;
  };
  components: {
    path: string;
  };
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: "file" | "dir";
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

export interface FailedComponent {
  name: string;
  error: string;
}

export interface AddResult {
  added: string[];
  skipped: string[];
  failed: FailedComponent[];
}

export interface ComponentList {
  components: VelarComponentMeta[];
  categories: string[];
}
