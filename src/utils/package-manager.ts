import fs from "fs";

export function detectPackageManager(): string {
  // Check lock files
  if (fs.existsSync("pnpm-lock.yaml") || fs.existsSync("pnpm-lock.yml")) {
    return "pnpm";
  }
  if (fs.existsSync("yarn.lock")) {
    return "yarn";
  }
  if (fs.existsSync("package-lock.json")) {
    return "npm";
  }
  if (fs.existsSync("bun.lockb")) {
    return "bun";
  }

  // Default to npm
  return "npm";
}
