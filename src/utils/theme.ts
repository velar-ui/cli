import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const THEMES = [
  "neutral",
  "blue",
  "green",
  "orange",
  "red",
  "rose",
  "violet",
  "yellow",
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_THEMES_DIR = path.resolve(__dirname, "../registry/themes");

export function copyTheme(theme: string, target: string): void {
  const source = path.join(REGISTRY_THEMES_DIR, `${theme}.css`);
  if (!fs.existsSync(source)) {
    throw new Error(`Theme "${theme}" not found in registry.`);
  }
  fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
}
