/**
 * API Response Models
 */

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  duration: number;
  url: string;
  success: boolean;
}

export interface ApiRequestConfig {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
}

export interface ApiError {
  message: string;
  status: number;
  statusText: string;
  url: string;
  response?: unknown;
}


