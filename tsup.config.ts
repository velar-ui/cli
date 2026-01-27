import { cpSync } from "fs";
import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  entry: ["src/index.ts"],
  format: ["esm"],
  sourcemap: true,
  minify: true,
  target: "esnext",
  outDir: "dist",
  treeshake: true,
  onSuccess: async () => {
    cpSync("src/registry/themes", "dist/registry/themes", {
      recursive: true,
      force: true,
    });
    cpSync("src/colors", "dist/colors", { recursive: true, force: true });
  },
});
