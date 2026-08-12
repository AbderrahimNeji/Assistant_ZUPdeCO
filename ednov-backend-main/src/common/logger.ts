import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

const winstonLogger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: process.env.SERVICE_NAME || 'ednov-backend' },
  transports: [new winston.transports.Console()],
});

export const winstonConfig: LoggerService = {
  log: (message: unknown, ...args: unknown[]) => winstonLogger.info(typeof message === 'string' ? message : String(message), ...args),
  error: (message: unknown, ...args: unknown[]) => winstonLogger.error(typeof message === 'string' ? message : String(message), ...args),
  warn: (message: unknown, ...args: unknown[]) => winstonLogger.warn(typeof message === 'string' ? message : String(message), ...args),
  debug: (message: unknown, ...args: unknown[]) => winstonLogger.debug(typeof message === 'string' ? message : String(message), ...args),
  verbose: (message: unknown, ...args: unknown[]) => winstonLogger.verbose(typeof message === 'string' ? message : String(message), ...args),
};
