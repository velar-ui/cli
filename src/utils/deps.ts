export function resolveDependencies(meta: any, registry: any): string[] {
  // Simple DAG: flat, no cycles
  const resolved: Set<string> = new Set();
  function visit(name: string) {
    const comp = registry.components[name];
    if (!comp) throw new Error(`Component "${name}" not found in registry.`);
    if (comp.dependencies) {
      for (const dep of comp.dependencies) {
        if (!resolved.has(dep)) visit(dep);
      }
    }
    resolved.add(name);
  }
  visit(meta.name);
  return Array.from(resolved);
}
