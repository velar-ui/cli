export class VelarError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "VelarError";
  }
}

export class ErrorHandler {
  handle(error: Error, context: string): void {
    if (error instanceof VelarError) {
      console.error(`[${error.code}] ${error.message}`);
      if (error.context) {
        console.error("Context:", error.context);
      }
    } else {
      console.error(`Unexpected error in ${context}: ${error.message}`);
    }

    // Don't exit here, let the caller handle it
  }
}
