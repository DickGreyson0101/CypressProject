/**
 * User API Service
 * Handles all user-related API operations using BaseApiClient
 */

import { 
  User, 
  LoginRequest, 
  LoginResponse, 
  CreateUserRequest, 
  CreateUserResponse, 
  UsersListResponse 
} from '@support/models/api/user.model';
import { BaseApiClient } from '@support/core/api/base-api-client';
import { SessionAuthStrategy } from '@support/core/api/auth/session-auth-strategy';
import { ApiResponse } from '@support/models/api/response.model';

export class UserApiService {
  private apiClient: BaseApiClient;

  constructor() {
    this.apiClient = new BaseApiClient({
      name: 'UserAPI',
      baseUrl: Cypress.env('apiBaseUrl') || 'http://localhost:3001',
      authStrategy: new SessionAuthStrategy(),
      enableLogging: Cypress.env('features')?.enableApiLogging !== false,
      enableRetry: Cypress.env('features')?.enableRetries !== false,
      maxRetries: 2,
      timeout: Cypress.env('timeouts')?.apiRequest || 15000
    });
  }

  /**
   * Login user (skip auth for login endpoint)
   */
  login(credentials: LoginRequest): Cypress.Chainable<LoginResponse> {
    return this.apiClient.request<LoginResponse>({
      method: 'POST',
      endpoint: '/login',
      body: credentials,
      skipAuth: true
    }).then((response: ApiResponse<LoginResponse>) => {
      expect(response.status).to.eq(200);
      return response.data;
    });
  }

  /**
   * Get users list
   */
  getUsers(): Cypress.Chainable<UsersListResponse> {
    return this.apiClient.request<UsersListResponse>({
      method: 'GET',
      endpoint: '/users'
    }).then((response: ApiResponse<UsersListResponse>) => {
      expect(response.status).to.eq(200);
      return response.data;
    });
  }

  /**
   * Create new user
   */
  createUser(userData: CreateUserRequest): Cypress.Chainable<CreateUserResponse> {
    return this.apiClient.request<CreateUserResponse>({
      method: 'POST',
      endpoint: '/users',
      body: userData
    }).then((response: ApiResponse<CreateUserResponse>) => {
      expect(response.status).to.eq(201);
      return response.data;
    });
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): Cypress.Chainable<{ user: User }> {
    return this.apiClient.request<{ user: User }>({
      method: 'GET',
      endpoint: `/users/${userId}`
    }).then((response: ApiResponse<{ user: User }>) => {
      expect(response.status).to.eq(200);
      return response.data;
    });
  }

  /**
   * Update user
   */
  updateUser(userId: string, userData: Partial<CreateUserRequest>): Cypress.Chainable<{ user: User }> {
    return this.apiClient.request<{ user: User }>({
      method: 'PATCH',
      endpoint: `/users/${userId}`,
      body: userData
    }).then((response: ApiResponse<{ user: User }>) => {
      expect(response.status).to.eq(200);
      return response.data;
    });
  }

  /**
   * Delete user
   */
  deleteUser(userId: string): Cypress.Chainable<void> {
    return this.apiClient.request<void>({
      method: 'DELETE',
      endpoint: `/users/${userId}`
    }).then((response: ApiResponse<void>) => {
      expect(response.status).to.eq(204);
    });
  }
}
