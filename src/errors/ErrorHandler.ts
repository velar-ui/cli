/**
 * Custom error class for Velyx-specific errors with code and context
 */
export class VelyxError extends Error {
  /**
   * Create a new VelyxError
   * @param message - Error message
   * @param code - Error code for categorization
   * @param context - Additional context data
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Readonly<Record<string, unknown>>,
  ) {
    super(message)
    this.name = 'VelyxError'
  }
}

/**
 * Handles and formats errors for display
 */
export class ErrorHandler {
  /**
   * Handle an error and display it appropriately
   * @param error - Error to handle
   * @param context - Context where the error occurred
   */
  handle(error: Error, context: string): void {
    if (error instanceof VelyxError) {
      console.error(`[${error.code}] ${error.message}`)
      if (error.context) {
        console.error('Context:', error.context)
      }
    } else {
      console.error(`Unexpected error in ${context}: ${error.message}`)
    }

    // Don't exit here, let the caller handle it
  }
}
