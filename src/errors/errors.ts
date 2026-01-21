export class RegistryError extends Error {
  constructor(
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = "RegistryError";
  }
}

export class NetworkError extends RegistryError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = "NetworkError";
  }
}

export class ComponentNotFoundError extends RegistryError {
  constructor(componentName: string, cause?: Error) {
    super(`Component "${componentName}" not found`, cause);
    this.name = "ComponentNotFoundError";
  }
}
