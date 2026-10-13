export class SetupError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'SetupError';
  }
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof SetupError) return error.message;
  return 'Setup CommerceKit CLI failed unexpectedly. Re-run with step debug logging enabled for more context.';
}
