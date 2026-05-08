/**
 * Logger utility for the Live AI Subtitle Translator extension
 * Provides structured logging with different levels and contexts
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
  stack?: string;
}

export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private currentLevel = LogLevel.DEBUG;
  private subscribers: Set<(entry: LogEntry) => void> = new Set();

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Enable/disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.currentLevel = enabled ? LogLevel.DEBUG : LogLevel.INFO;
  }

  /**
   * Add a log subscriber
   */
  subscribe(callback: (entry: LogEntry) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Log a debug message
   */
  debug(context: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, context, message, data);
  }

  /**
   * Log an info message
   */
  info(context: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, context, message, data);
  }

  /**
   * Log a warning message
   */
  warn(context: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, context, message, data);
  }

  /**
   * Log an error message
   */
  error(context: string, message: string, error?: Error | any): void {
    let data: any;
    let stack: string | undefined;

    if (error instanceof Error) {
      data = { name: error.name, message: error.message };
      stack = error.stack;
    } else if (typeof error === 'object') {
      data = error;
    } else {
      data = { error };
    }

    this.log(LogLevel.ERROR, context, message, data, stack);
  }

  /**
   * Log a fatal error
   */
  fatal(context: string, message: string, error?: Error | any): void {
    let data: any;
    let stack: string | undefined;

    if (error instanceof Error) {
      data = { name: error.name, message: error.message };
      stack = error.stack;
    } else if (typeof error === 'object') {
      data = error;
    } else {
      data = { error };
    }

    this.log(LogLevel.FATAL, context, message, data, stack);
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, context: string, message: string, data?: any, stack?: string): void {
    if (level < this.currentLevel) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      context,
      message,
      data,
      stack
    };

    this.logs.push(entry);

    // Trim logs if exceeding maximum
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Output to console
    this.outputToConsole(entry);

    // Notify subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(entry);
      } catch (error) {
        console.error('Logger subscriber error:', error);
      }
    });
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.context}]`;

    const args = [prefix, entry.message];
    
    if (entry.data) {
      args.push(entry.data);
    }

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(...args);
        break;
      case LogLevel.INFO:
        console.info(...args);
        break;
      case LogLevel.WARN:
        console.warn(...args);
        break;
      case LogLevel.ERROR:
        console.error(...args);
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
      case LogLevel.FATAL:
        console.error('🔴 FATAL:', ...args);
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
    }
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(entry => entry.level === level);
  }

  /**
   * Get logs by context
   */
  getLogsByContext(context: string): LogEntry[] {
    return this.logs.filter(entry => entry.context === context);
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs to JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Get log statistics
   */
  getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byContext: Record<string, number>;
    oldest: number | null;
    newest: number | null;
  } {
    const byLevel: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.FATAL]: 0
    };

    const byContext: Record<string, number> = {};

    this.logs.forEach(entry => {
      byLevel[entry.level]++;
      byContext[entry.context] = (byContext[entry.context] || 0) + 1;
    });

    const timestamps = this.logs.map(entry => entry.timestamp);
    const oldest = timestamps.length > 0 ? Math.min(...timestamps) : null;
    const newest = timestamps.length > 0 ? Math.max(...timestamps) : null;

    return {
      total: this.logs.length,
      byLevel,
      byContext,
      oldest,
      newest
    };
  }

  /**
   * Create a context-specific logger
   */
  createContext(context: string): ContextLogger {
    return new ContextLogger(context, this);
  }
}

/**
 * Context-specific logger
 */
export class ContextLogger {
  constructor(
    private context: string,
    private logger: Logger
  ) {}

  debug(message: string, data?: any): void {
    this.logger.debug(this.context, message, data);
  }

  info(message: string, data?: any): void {
    this.logger.info(this.context, message, data);
  }

  warn(message: string, data?: any): void {
    this.logger.warn(this.context, message, data);
  }

  error(message: string, error?: Error | any): void {
    this.logger.error(this.context, message, error);
  }

  fatal(message: string, error?: Error | any): void {
    this.logger.fatal(this.context, message, error);
  }
}

/**
 * Error handling utilities
 */
export class ErrorHandler {
  private static logger = Logger.getInstance();

  /**
   * Handle async errors safely
   */
  static async safeAsync<T>(
    operation: () => Promise<T>,
    context: string,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      this.logger.error(context, 'Async operation failed', error);
      return fallback;
    }
  }

  /**
   * Handle sync errors safely
   */
  static safe<T>(
    operation: () => T,
    context: string,
    fallback?: T
  ): T | undefined {
    try {
      return operation();
    } catch (error) {
      this.logger.error(context, 'Operation failed', error);
      return fallback;
    }
  }

  /**
   * Create a safe wrapper for event handlers
   */
  static safeEventHandler<T extends (...args: any[]) => any>(
    handler: T,
    context: string
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        return handler(...args);
      } catch (error) {
        this.logger.error(context, 'Event handler failed', error);
      }
    }) as T;
  }

  /**
   * Retry an operation with exponential backoff
   */
  static async retry<T>(
    operation: () => Promise<T>,
    context: string,
    maxAttempts = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(context, `Attempt ${attempt} failed`, { error: lastError.message });

        if (attempt === maxAttempts) {
          this.logger.error(context, 'All retry attempts failed', lastError);
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Create a timeout wrapper
   */
  static withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    context: string
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          this.logger.error(context, `Operation timed out after ${timeoutMs}ms`);
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export context-specific loggers
export const backgroundLogger = logger.createContext('Background');
export const contentLogger = logger.createContext('Content');
export const popupLogger = logger.createContext('Popup');
export const offscreenLogger = logger.createContext('Offscreen');
export const whisperLogger = logger.createContext('Whisper');
export const translationLogger = logger.createContext('Translation');
export const subtitleLogger = logger.createContext('Subtitle');
