import fs from "fs";

export function isLaravelProject(): boolean {
  return fs.existsSync("composer.json") && fs.existsSync("artisan");
}
