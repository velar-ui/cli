import fs from "fs";
import path from "path";

export function hasAlpineInPackageJson(): boolean {
  try {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    return (
      (pkg.dependencies &&
        Object.keys(pkg.dependencies).some((dep) =>
          dep.toLowerCase().includes("alpine"),
        )) ||
      (pkg.devDependencies &&
        Object.keys(pkg.devDependencies).some((dep) =>
          dep.toLowerCase().includes("alpine"),
        ))
    );
  } catch {
    return false;
  }
}

export function hasAlpineInAssets(): boolean {
  const jsFiles = [
    "resources/js/app.js",
    "resources/js/bootstrap.js",
    "resources/js/main.js",
  ];

  for (const file of jsFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, "utf8");
      if (content.toLowerCase().includes("alpine")) {
        return true;
      }
    }
  }
  return false;
}

export function hasAlpineInLayouts(): boolean {
  const layoutDir = "resources/views/layouts";
  if (!fs.existsSync(layoutDir)) return false;

  try {
    const files = fs.readdirSync(layoutDir, { recursive: true }) as string[];
    for (const file of files) {
      if (file.endsWith(".blade.php")) {
        const content = fs.readFileSync(path.join(layoutDir, file), "utf8");
        if (content.toLowerCase().includes("alpine")) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

export function hasLivewire(): boolean {
  try {
    const composer = JSON.parse(fs.readFileSync("composer.json", "utf8"));
    return (
      (composer.require &&
        Object.keys(composer.require).some((dep) =>
          dep.toLowerCase().includes("livewire"),
        )) ||
      (composer["require-dev"] &&
        Object.keys(composer["require-dev"]).some((dep) =>
          dep.toLowerCase().includes("livewire"),
        ))
    );
  } catch {
    return false;
  }
}

export function hasAlpineJs(): boolean {
  return (
    hasAlpineInPackageJson() || hasAlpineInAssets() || hasAlpineInLayouts()
  );
}

export function hasInteractivitySupport(): boolean {
  return hasAlpineJs() || hasLivewire();
}
