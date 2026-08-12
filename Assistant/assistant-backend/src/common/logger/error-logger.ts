export type ErrorLogMetadata = {
  userId?: string;
  conversationId?: string;
  dataset?: string;
  documentId?: string;
  question?: string;
  [key: string]: unknown;
};

export class ErrorLogger {
  static log(
    error: unknown,
    context: string,
    metadata?: ErrorLogMetadata,
  ): void {
    const timestamp = new Date().toISOString();
    const name =
      error instanceof Error ? error.name : typeof error;
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : JSON.stringify(error);
    const stack =
      error instanceof Error ? error.stack : undefined;

    console.error('==================== ERROR ====================');
    console.error(`Timestamp : ${timestamp}`);
    console.error(`Context   : ${context}`);
    console.error(`Name      : ${name}`);
    console.error(`Message   : ${message}`);

    if (metadata && Object.keys(metadata).length > 0) {
      console.error('Metadata  :');
      for (const [key, value] of Object.entries(metadata)) {
        if (value !== undefined) {
          console.error(`  - ${key}: ${String(value)}`);
        }
      }
    }

    if (stack) {
      console.error('Stack     :');
      console.error(stack);
    }

    console.error('===============================================');
  }

  static logDuration(
    context: string,
    durationMs: number,
    metadata?: ErrorLogMetadata,
  ): void {
    const rounded = Number(durationMs.toFixed(2));
    const metaParts = metadata
      ? Object.entries(metadata)
          .filter(([, value]) => value !== undefined)
          .map(([key, value]) => `${key}=${String(value)}`)
          .join(', ')
      : '';

    console.log(
      `⏱️  [${context}] ${rounded} ms` +
        (metaParts ? ` | ${metaParts}` : ''),
    );
  }
}
