/**
 * Test Logger for Cypress
 * Simplified logging with sensitive data masking
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  category?: string;
}

export class TestLogger {
  private static instance: TestLogger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private readonly sensitiveKeys = [
    'password', 'token', 'authorization', 'apikey', 'access_token', 
    'refresh_token', 'client_secret', 'secretkey', 'auth'
  ];

  private constructor() {
    this.logLevel = this.getLogLevelFromEnv();
  }

  public static getInstance(): TestLogger {
    if (!TestLogger.instance) {
      TestLogger.instance = new TestLogger();
    }
    return TestLogger.instance;
  }

  public error(message: string, context?: Record<string, unknown>, category?: string): void {
    this.log(LogLevel.ERROR, message, context, category);
    cy.log(`❌ ${message}`, context ? this.maskSensitiveData(context) : undefined);
  }

  public warn(message: string, context?: Record<string, unknown>, category?: string): void {
    this.log(LogLevel.WARN, message, context, category);
    if (this.shouldLog(LogLevel.WARN)) {
      cy.log(`⚠️ ${message}`, context ? this.maskSensitiveData(context) : undefined);
    }
  }

  public info(message: string, context?: Record<string, unknown>, category?: string): void {
    this.log(LogLevel.INFO, message, context, category);
    if (this.shouldLog(LogLevel.INFO)) {
      cy.log(`ℹ️ ${message}`, context ? this.maskSensitiveData(context) : undefined);
    }
  }

  public debug(message: string, context?: Record<string, unknown>, category?: string): void {
    this.log(LogLevel.DEBUG, message, context, category);
    if (this.shouldLog(LogLevel.DEBUG)) {
      cy.log(`🐛 ${message}`, context ? this.maskSensitiveData(context) : undefined);
    }
  }

  public step(stepDescription: string, context?: Record<string, unknown>): void {
    this.info(`STEP: ${stepDescription}`, context, 'TEST_STEP');
  }

  public apiCall(method: string, url: string, statusCode: number, duration: number, context?: Record<string, unknown>): void {
    const statusEmoji = statusCode >= 200 && statusCode < 300 ? '✅' : '❌';
    const message = `API ${method} ${url} - ${statusCode} (${duration}ms)`;
    this.info(message, { statusCode, duration, ...context }, 'API');
    cy.log(`${statusEmoji} ${message}`, context ? this.maskSensitiveData(context) : undefined);
  }

  public assertion(description: string, passed: boolean, expected?: unknown, actual?: unknown): void {
    const context: Record<string, unknown> = { passed };
    if (!passed) {
      context.expected = expected;
      context.actual = actual;
    }

    const message = `${passed ? 'PASS' : 'FAIL'}: ${description}`;
    if (passed) {
      this.info(message, context, 'ASSERTION');
    } else {
      this.error(message, context, 'ASSERTION');
    }
  }

  public getLogs(category?: string, level?: LogLevel): LogEntry[] {
    let filteredLogs = this.logs;

    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level <= level);
    }

    return filteredLogs;
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public exportLogs(): string {
    return JSON.stringify(
      this.logs.map(log => ({
        ...log,
        context: log.context ? this.maskSensitiveData(log.context) : undefined,
      })),
      null,
      2
    );
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, category?: string): void {
    this.logs.push({
      level,
      message,
      timestamp: new Date(),
      context: context ? this.maskSensitiveData(context) : undefined,
      category,
    });
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = Cypress.env('LOG_LEVEL') || 'INFO';
    return LogLevel[envLevel.toUpperCase() as keyof typeof LogLevel] || LogLevel.INFO;
  }

  private maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const masked: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const isSensitive = this.sensitiveKeys.some(sensitiveKey =>
        key.toLowerCase().includes(sensitiveKey.toLowerCase())
      );

      if (isSensitive) {
        masked[key] = '*****';
      } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          masked[key] = value.map(item =>
            typeof item === 'object' && item !== null ? this.maskSensitiveData(item as Record<string, unknown>) : item
          );
        } else {
          masked[key] = this.maskSensitiveData(value as Record<string, unknown>);
        }
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }
}

// Export singleton instance for easy access
export const logger = TestLogger.getInstance();
