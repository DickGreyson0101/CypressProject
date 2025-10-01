/**
 * Base API Client - Combining best practices from all 3 analyzed projects
 *
 * From New_PlayWright: Strategy Pattern Authentication, Smart Token Management
 * From Old_PlayWright: Professional Logging, Error Handling, Data Masking
 * From New_Cypress: Multiple Grant Types, Cypress Chainable Integration
 */

import { AuthenticationStrategy } from './auth/auth-strategy.interface';
import { ApiResponse, ApiRequestConfig } from '@models/api/response.model';

export interface BaseApiClientConfig {
  name: string;
  baseUrl: string;
  authStrategy: AuthenticationStrategy;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  enableLogging?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
}

export class BaseApiClient {
  private config: BaseApiClientConfig;
  private sensitiveKeys = [
    'password',
    'token',
    'authorization',
    'apikey',
    'access_token',
    'refresh_token',
    'client_secret',
    'secretkey',
    'auth',
  ];

  constructor(config: BaseApiClientConfig) {
    this.config = {
      timeout: 30000,
      enableLogging: true,
      enableRetry: true,
      maxRetries: 2,
      ...config,
    };
  }

  /**
   * Generic HTTP request method with comprehensive error handling and smart retry logic
   */
  public request<T = Record<string, unknown>>(requestConfig: ApiRequestConfig): Cypress.Chainable<ApiResponse<T>> {
    this.validateRequestConfig(requestConfig);

    return cy.then(() => {
      if (requestConfig.skipAuth) {
        // Skip authentication for this request
        return this.executeRequestWithRetry<T>(requestConfig, '');
      } else {
        return this.config.authStrategy.getToken().then((token: string) => {
          return this.executeRequestWithRetry<T>(requestConfig, token);
        });
      }
    });
  }

  /**
   * Execute request with intelligent retry mechanism
   */
  private executeRequestWithRetry<T>(
    requestConfig: ApiRequestConfig,
    token: string,
    attemptNumber: number = 1
  ): Cypress.Chainable<ApiResponse<T>> {
    const fullUrl = this.buildFullUrl(requestConfig.endpoint);
    const headers = this.buildHeaders(requestConfig.headers, token);
    const startTime = Date.now();
    const maxRetries = requestConfig.retries ?? this.config.maxRetries ?? 2;
    const isRetryAttempt = attemptNumber > 1;

    // Enhanced logging
    if (this.config.enableLogging) {
      if (isRetryAttempt) {
        cy.log(`🔄 API Retry attempt ${attemptNumber}/${maxRetries + 1}: ${requestConfig.method} ${fullUrl}`);
      }
      this.logRequest(requestConfig.method, fullUrl, requestConfig.body, headers, attemptNumber);
    }

    const requestChain = cy
      .request({
        method: requestConfig.method,
        url: fullUrl,
        headers,
        body: this.formatRequestBody(requestConfig.body),
        timeout: requestConfig.timeout || this.config.timeout,
        failOnStatusCode: false,
      })
      .then((response: Cypress.Response<T>) => {
        const duration = Date.now() - startTime;

        if (this.config.enableLogging) {
          this.logResponse(response, duration, attemptNumber);
        }

        // Check if we should retry this request
        const shouldRetry = this.shouldRetryRequest(response, requestConfig, attemptNumber, maxRetries);

        if (shouldRetry.retry) {
          cy.log(
            `🔄 ${shouldRetry.reason} - Retrying in ${shouldRetry.delayMs}ms (attempt ${attemptNumber + 1}/${maxRetries + 1})`
          );

          // Return a new chainable for retry
          return cy
            .wait(shouldRetry.delayMs || 1000)
            .then(() => {
              if (shouldRetry.refreshToken) {
                // Refresh token before retry
                return this.config.authStrategy.refreshToken();
              } else {
                // Retry with same token
                return cy.wrap(token);
              }
            })
            .then((tokenForRetry: string) => {
              return this.executeRequestWithRetry<T>(requestConfig, tokenForRetry, attemptNumber + 1);
            }) as Cypress.Chainable<ApiResponse<T>>;
        }

        // No retry needed or max retries reached
        if (!response.isOkStatusCode) {
          const errorMessage = `${requestConfig.method} ${fullUrl} failed with status ${response.status}`;
          cy.addTestContext(`❌ API Error: ${errorMessage} (after ${attemptNumber} attempts)`);

          // Log final failure details
          if (attemptNumber > 1) {
            cy.log(`❌ Request failed after ${attemptNumber} attempts. Final status: ${response.status}`);
          }
        } else if (isRetryAttempt) {
          cy.log(`✅ Request succeeded on attempt ${attemptNumber}`);
        }

        return cy.wrap(this.transformResponse<T>(response, duration, fullUrl));
      });

    return requestChain as Cypress.Chainable<ApiResponse<T>>;
  }

  /**
   * Determine if request should be retried based on response and configuration
   */
  private shouldRetryRequest(
    response: Cypress.Response<unknown>,
    requestConfig: ApiRequestConfig,
    attemptNumber: number,
    maxRetries: number
  ): { retry: boolean; reason?: string; delayMs?: number; refreshToken?: boolean } {
    // Don't retry if retries are disabled or max attempts reached
    if (!this.config.enableRetry || attemptNumber > maxRetries) {
      return { retry: false };
    }

    // Don't retry successful responses
    if (response.isOkStatusCode) {
      return { retry: false };
    }

    const status = response.status;
    const method = requestConfig.method;

    // 401 Unauthorized - refresh token and retry
    if (status === 401) {
      return {
        retry: true,
        reason: 'Unauthorized (401) - refreshing token',
        delayMs: 500,
        refreshToken: true,
      };
    }

    // 429 Too Many Requests - retry with exponential backoff
    if (status === 429) {
      const delayMs = Math.min(1000 * Math.pow(2, attemptNumber - 1), 10000); // Max 10s
      return {
        retry: true,
        reason: 'Rate limited (429)',
        delayMs,
        refreshToken: false,
      };
    }

    // 502, 503, 504 - Server errors, retry with backoff
    if ([502, 503, 504].includes(status)) {
      const delayMs = Math.min(2000 * Math.pow(1.5, attemptNumber - 1), 15000); // Max 15s
      return {
        retry: true,
        reason: `Server error (${status})`,
        delayMs,
        refreshToken: false,
      };
    }

    // 500 Internal Server Error - retry only for GET requests (idempotent)
    if (status === 500 && method === 'GET') {
      return {
        retry: true,
        reason: 'Internal server error (500) on GET request',
        delayMs: 1000 * attemptNumber,
        refreshToken: false,
      };
    }

    // Network timeout or connection errors
    if (status === 0 || !status) {
      return {
        retry: true,
        reason: 'Network/connection error',
        delayMs: 1000 * attemptNumber,
        refreshToken: false,
      };
    }

    // Don't retry client errors (4xx except 401, 429)
    if (status >= 400 && status < 500) {
      return { retry: false };
    }

    // Default: don't retry
    return { retry: false };
  }

  // HTTP method shortcuts
  public get<T = Record<string, unknown>>(
    endpoint: string,
    config?: Partial<ApiRequestConfig>
  ): Cypress.Chainable<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', endpoint, ...config });
  }

  public post<T = Record<string, unknown>>(
    endpoint: string,
    body?: Record<string, unknown>,
    config?: Partial<ApiRequestConfig>
  ): Cypress.Chainable<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', endpoint, body, ...config });
  }

  public put<T = Record<string, unknown>>(
    endpoint: string,
    body?: Record<string, unknown>,
    config?: Partial<ApiRequestConfig>
  ): Cypress.Chainable<ApiResponse<T>> {
    return this.request<T>({ method: 'PUT', endpoint, body, ...config });
  }

  public delete<T = Record<string, unknown>>(
    endpoint: string,
    config?: Partial<ApiRequestConfig>
  ): Cypress.Chainable<ApiResponse<T>> {
    return this.request<T>({ method: 'DELETE', endpoint, ...config });
  }

  public patch<T = Record<string, unknown>>(
    endpoint: string,
    body?: Record<string, unknown>,
    config?: Partial<ApiRequestConfig>
  ): Cypress.Chainable<ApiResponse<T>> {
    return this.request<T>({ method: 'PATCH', endpoint, body, ...config });
  }

  private validateRequestConfig(config: ApiRequestConfig): void {
    if (!config.endpoint) {
      throw new Error('API request endpoint is required');
    }
    if (!config.method) {
      throw new Error('API request method is required');
    }
  }

  private buildFullUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.config.baseUrl}${cleanEndpoint}`;
  }

  private buildHeaders(additionalHeaders?: Record<string, string>, token?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders,
      ...additionalHeaders,
    };

    if (token) {
      headers['Authorization'] = token;
    }

    return headers;
  }

  private formatRequestBody(body?: Record<string, unknown> | string): string | undefined {
    if (!body) return undefined;
    if (typeof body === 'string') return body;
    return JSON.stringify(this.sanitizeJsonValues(body));
  }

  /**
   * JSON sanitization from New_PlayWright - prevents template injection
   */
  private sanitizeJsonValues(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = value.replace(/{{|}}/g, '__');
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'object' && item !== null ? this.sanitizeJsonValues(item as Record<string, unknown>) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeJsonValues(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Normalize headers to ensure all values are strings
   */
  private normalizeHeaders(headers: { [key: string]: string | string[] }): Record<string, string> {
    const normalized: Record<string, string> = {};

    Object.entries(headers).forEach(([key, value]) => {
      normalized[key] = Array.isArray(value) ? value.join(', ') : String(value);
    });

    return normalized;
  }

  private transformResponse<T>(cypressResponse: Cypress.Response<T>, duration: number, url: string): ApiResponse<T> {
    return {
      data: cypressResponse.body,
      status: cypressResponse.status,
      statusText: cypressResponse.statusText || '',
      headers: this.normalizeHeaders(cypressResponse.headers || {}),
      duration,
      url,
      success: cypressResponse.isOkStatusCode,
    };
  }

  /**
   * Enhanced logging with sensitive data masking from Old_PlayWright
   */
  private logRequest(
    method: string,
    url: string,
    body?: Record<string, unknown> | string,
    headers?: Record<string, string>,
    attemptNumber?: number
  ): void {
    const attemptPrefix = attemptNumber && attemptNumber > 1 ? `[Attempt ${attemptNumber}] ` : '';
    cy.log(`📤 ${attemptPrefix}${method} ${url}`);

    if (headers && this.config.enableLogging) {
      const maskedHeaders = this.maskSensitiveData(headers);
      cy.log('📋 Request Headers:', JSON.stringify(maskedHeaders, null, 2));
    }

    if (body && this.config.enableLogging) {
      const bodyToLog = typeof body === 'string' ? body : this.maskSensitiveData(body);
      cy.log('📄 Request Body:', JSON.stringify(bodyToLog, null, 2));
    }
  }

  private logResponse<T>(response: Cypress.Response<T>, duration: number, attemptNumber?: number): void {
    const statusEmoji = response.isOkStatusCode ? '✅' : '❌';
    const attemptPrefix = attemptNumber && attemptNumber > 1 ? `[Attempt ${attemptNumber}] ` : '';
    cy.log(`📥 ${attemptPrefix}${statusEmoji} ${response.status} (${duration}ms)`);

    if (this.config.enableLogging && response.body) {
      const maskedBody = this.maskSensitiveData(response.body);
      cy.log('📄 Response Body:', JSON.stringify(maskedBody, null, 2));
    }
  }

  /**
   * Sensitive data masking from Old_PlayWright best practices
   */
  private maskSensitiveData(data: Record<string, unknown> | unknown): Record<string, unknown> | unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.maskSensitiveData(item));
    }

    const masked: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const isSensitive = this.sensitiveKeys.some(sensitiveKey =>
        key.toLowerCase().includes(sensitiveKey.toLowerCase())
      );

      if (isSensitive) {
        masked[key] = '*****';
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = this.maskSensitiveData(value);
      } else {
        masked[key] = value;
      }
    }

    return masked;
  }
}
