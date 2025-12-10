/**
 * Structured logging utility
 * 
 * Provides environment-aware logging with different log levels.
 * Only logs in development mode or when LOG_LEVEL environment variable is set.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    // Determine if we're in development mode
    this.isDevelopment = 
      typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' ||
      typeof window !== 'undefined' && (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1');

    // Get log level from environment or default to 'info' in dev, 'warn' in prod
    const envLogLevel = 
      (typeof process !== 'undefined' && process.env?.LOG_LEVEL) ||
      (typeof window !== 'undefined' && (window as any).LOG_LEVEL);
    
    this.logLevel = (envLogLevel as LogLevel) || (this.isDevelopment ? 'info' : 'warn');
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${level.toUpperCase()}] [${timestamp}]`;
    
    if (context) {
      return `${prefix} ${message} ${JSON.stringify(context)}`;
    }
    return `${prefix} ${message}`;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      const errorContext = error instanceof Error 
        ? { ...context, error: error.message, stack: error.stack }
        : { ...context, error: String(error) };
      console.error(this.formatMessage('error', message, errorContext));
    }
  }
}

// Export singleton instance
export const logger = new Logger();

