import fs from "fs";
import type { VelarConfig } from "../types/index";

/**
 * Write Velar configuration to velar.json file
 * @param config - Configuration object to write
 * @throws Error if file write fails
 */
export function writeVelarConfig(config: VelarConfig): void {
  fs.writeFileSync(
    "velar.json",
    JSON.stringify(config, null, 2) + "\n",
    "utf8",
  );
}

/**
 * Read Velar configuration from velar.json file
 * @returns Configuration object
 * @throws Error if file doesn't exist or is invalid
 */
export function readVelarConfig(): VelarConfig {
  if (!fs.existsSync("velar.json")) {
    throw new Error("Velar configuration not found.");
  }
  return JSON.parse(fs.readFileSync("velar.json", "utf8")) as VelarConfig;
}
