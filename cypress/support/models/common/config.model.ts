/**
 * Configuration models for the testing framework
 * Combines best practices from all three analyzed projects
 */

// Database config removed - Cypress should test through APIs, not direct DB access

export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  scope: string;
  grantType: 'client_credentials' | 'password' | 'authorization_code';
}

export interface FeatureFlags {
  enableApiLogging: boolean;
  enableScreenshots: boolean;
  enableRetries: boolean;
  enableVideoRecording: boolean;
  enableParallelExecution: boolean;
}

export interface TimeoutConfig {
  pageLoad: number;
  apiRequest: number;
  elementWait: number;
  defaultCommand: number;
}

export interface UserCredentials {
  username: string;
  password: string;
  role: string;
}

export interface TestDataConfig {
  enableDataGeneration: boolean;
  preserveTestData: boolean;
  cleanupAfterTests: boolean;
}

export interface EnvironmentConfig {
  environment: string;
  baseUrl: string;
  apiBaseUrl: string;
  // database: DatabaseConfig; // Removed - not suitable for Cypress frontend testing
  auth: AuthConfig;
  features: FeatureFlags;
  timeouts: TimeoutConfig;
  users: Record<string, UserCredentials>;
  testData: TestDataConfig;
}

export interface TestContext {
  environment: string;
  testStartTime: Date;
  currentUser?: UserCredentials;
  testData: Record<string, unknown>;
  apiResponses: Record<string, unknown>;
}
