type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogFields = Record<string, unknown>;

function serializeError(error: unknown): LogFields | undefined {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack:
        process.env.NODE_ENV === 'production' ? undefined : error.stack,
    };
  }
  return { message: String(error) };
}

function write(level: LogLevel, message: string, fields: LogFields = {}) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: 'zupdeco-assistant-api',
    ...fields,
  };

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const AppLogger = {
  debug(message: string, fields?: LogFields) {
    if (process.env.NODE_ENV === 'production') return;
    write('debug', message, fields);
  },
  info(message: string, fields?: LogFields) {
    write('info', message, fields);
  },
  warn(message: string, fields?: LogFields) {
    write('warn', message, fields);
  },
  error(message: string, fields?: LogFields, error?: unknown) {
    write('error', message, {
      ...fields,
      error: serializeError(error),
    });
  },
};
