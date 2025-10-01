/**
 * Error Handler - Centralized error management for Cypress tests
 */

import { logger } from '../logging/test-logger';

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  API = 'API',
  UI = 'UI',
  CONFIGURATION = 'CONFIGURATION',
  TIMEOUT = 'TIMEOUT',
  NETWORK = 'NETWORK',
  ASSERTION = 'ASSERTION',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorContext {
  errorType: ErrorType;
  originalError?: Error;
  additionalInfo?: Record<string, unknown>;
  timestamp: Date;
  testName?: string;
  specName?: string;
  stackTrace?: string;
  recovery?: {
    attempted: boolean;
    successful?: boolean;
    strategy?: string;
  };
}

export interface ValidationRule {
  field: string;
  value: unknown;
  rule: string;
  message?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorHistory: ErrorContext[] = [];

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Handle general errors with context and logging
  public handleError(error: unknown, customMessage?: string, errorType: ErrorType = ErrorType.UNKNOWN): ErrorContext {
    const errorContext = this.createErrorContext(error, errorType, customMessage);
    this.processError(errorContext, customMessage || errorContext.originalError?.message || 'Unknown error');
    return errorContext;
  }

  // Handle API errors with specific context
  public handleApiError(
    error: unknown,
    endpoint: string,
    method: string,
    statusCode?: number,
    responseBody?: unknown
  ): ErrorContext {
    const additionalInfo = {
      endpoint,
      method,
      statusCode,
      responseBody: this.sanitizeResponseBody(responseBody),
    };

    const errorContext = this.createErrorContext(error, ErrorType.API, undefined, additionalInfo);
    this.processError(errorContext, `API Error: ${method} ${endpoint} - Status: ${statusCode}`);
    return errorContext;
  }

  // Handle UI errors with element context
  public handleUiError(error: unknown, selector: string, action: string, pageUrl?: string): ErrorContext {
    const additionalInfo = {
      selector,
      action,
      pageUrl,
      viewport: {
        width: Cypress.config('viewportWidth'),
        height: Cypress.config('viewportHeight'),
      },
    };

    const errorContext = this.createErrorContext(error, ErrorType.UI, undefined, additionalInfo);
    this.processError(errorContext, `UI Error: ${action} on ${selector}`);
    return errorContext;
  }

  // Validate required fields with detailed error reporting
  public validateRequired(rules: ValidationRule[]): void {
    const failures = rules.filter(rule => !this.isValidValue(rule.value, rule.rule));

    if (failures.length > 0) {
      const errorMessage = this.formatValidationErrors(failures);
      const error = new Error(errorMessage);
      const errorContext = this.createErrorContext(error, ErrorType.VALIDATION, undefined, {
        validationFailures: failures,
      });
      this.processError(errorContext, errorMessage);
      throw error;
    }
  }

  // Check if value is not empty/null/undefined
  public checkNotEmpty(value: unknown, fieldName: string): void {
    if (this.isEmpty(value)) {
      const error = new Error(`Required field '${fieldName}' cannot be empty`);
      this.handleError(error, `Validation failed for field: ${fieldName}`, ErrorType.VALIDATION);
      throw error;
    }
  }

  // Attempt error recovery with different strategies
  public attemptRecovery(errorContext: ErrorContext, recoveryFn: () => void, strategy: string): boolean {
    try {
      logger.info(`Attempting error recovery using strategy: ${strategy}`, {
        originalError: errorContext.originalError?.message,
        errorType: errorContext.errorType,
      });

      recoveryFn();
      errorContext.recovery = { attempted: true, successful: true, strategy };
      logger.info(`✅ Error recovery successful using strategy: ${strategy}`);
      return true;
    } catch (recoveryError) {
      errorContext.recovery = { attempted: true, successful: false, strategy };
      logger.error(`❌ Error recovery failed using strategy: ${strategy}`, {
        recoveryError: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
      });
      return false;
    }
  }

  // Get error statistics for reporting
  public getErrorStatistics(): Record<string, unknown> {
    const totalErrors = this.errorHistory.length;
    const errorsByType = this.errorHistory.reduce((acc, error) => {
      acc[error.errorType] = (acc[error.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recoveryAttempts = this.errorHistory.filter(e => e.recovery?.attempted).length;
    const successfulRecoveries = this.errorHistory.filter(e => e.recovery?.successful).length;

    return {
      totalErrors,
      errorsByType,
      recoveryAttempts,
      successfulRecoveries,
      recoverySuccessRate: recoveryAttempts > 0 ? (successfulRecoveries / recoveryAttempts) * 100 : 0,
    };
  }

  // Export error history for external analysis
  public exportErrorHistory(): string {
    return JSON.stringify(this.errorHistory, null, 2);
  }

  // Clear error history
  public clearErrorHistory(): void {
    this.errorHistory = [];
  }

  private createErrorContext(
    error: unknown,
    errorType: ErrorType,
    customMessage?: string,
    additionalInfo?: Record<string, unknown>
  ): ErrorContext {
    const originalError = error instanceof Error ? error : new Error(String(error));

    return {
      errorType,
      originalError,
      additionalInfo,
      timestamp: new Date(),
      testName: Cypress.currentTest?.title,
      specName: Cypress.spec?.name,
      stackTrace: originalError.stack,
    };
  }

  // Process error: log, store, and add to Cypress context
  private processError(errorContext: ErrorContext, contextMessage: string): void {
    this.logError(errorContext);
    this.errorHistory.push(errorContext);
    
    // Add context to test using cy.log instead of addTestContext
    cy.log(`❌ ${contextMessage}`);
  }

  private logError(errorContext: ErrorContext): void {
    const message = `${errorContext.errorType} Error: ${errorContext.originalError?.message}`;
    logger.error(message, {
      errorType: errorContext.errorType,
      testName: errorContext.testName,
      specName: errorContext.specName,
      additionalInfo: errorContext.additionalInfo,
      stackTrace: errorContext.stackTrace,
    });
  }

  private isEmpty(value: unknown): boolean {
    return value === null || value === undefined || value === '';
  }

  private isValidValue(value: unknown, rule: string): boolean {
    const validationRules: Record<string, (val: unknown) => boolean> = {
      required: (val) => !this.isEmpty(val),
      notNull: (val) => val !== null,
      notUndefined: (val) => val !== undefined,
      notEmpty: (val) => val !== '',
      isString: (val) => typeof val === 'string',
      isNumber: (val) => typeof val === 'number' && !isNaN(val),
      isBoolean: (val) => typeof val === 'boolean',
      isArray: (val) => Array.isArray(val),
      isObject: (val) => typeof val === 'object' && val !== null && !Array.isArray(val),
    };

    return validationRules[rule]?.(value) ?? true;
  }

  private formatValidationErrors(failures: ValidationRule[]): string {
    const errorMessages = failures.map(
      failure => failure.message || `Field '${failure.field}' failed validation rule '${failure.rule}'`
    );
    return `Validation failed:\n${errorMessages.join('\n')}`;
  }

  private sanitizeResponseBody(responseBody: unknown): unknown {
    if (typeof responseBody === 'object' && responseBody !== null) {
      const sanitized = JSON.parse(JSON.stringify(responseBody));
      this.maskSensitiveFields(sanitized);
      return sanitized;
    }
    return responseBody;
  }

  private maskSensitiveFields(obj: Record<string, unknown>): void {
    const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'key'];
    
    for (const key in obj) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        obj[key] = '*****';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.maskSensitiveFields(obj[key] as Record<string, unknown>);
      }
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();
