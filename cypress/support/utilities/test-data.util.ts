/**
 * Test Data Utilities
 * Generates test data for various scenarios
 */

import { CreateUserRequest } from '@support/models/api/user.model';

export class TestDataUtil {
  /**
   * Generate unique timestamp
   */
  static getTimestamp(): number {
    return Date.now();
  }

  /**
   * Generate random string
   */
  static generateRandomString(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate test user data
   */
  static generateUserData(): CreateUserRequest {
    const timestamp = this.getTimestamp();
    const randomId = this.generateRandomString(6);
    
    return {
      firstName: `Test${randomId}`,
      lastName: 'User',
      username: `testuser${timestamp}`,
      password: 'password123',
      email: `test${timestamp}@example.com`,
      phoneNumber: '123-456-7890',
      avatar: 'https://avatars.dicebear.com/api/human/test.svg',
      balance: 1000
    };
  }

  /**
   * Get user from config
   */
  static getUserFromConfig(role: string = 'admin'): { username: string; password: string; role: string } {
    const users = Cypress.env('users');
    const user = users[role];
    
    if (!user) {
      throw new Error(`User with role "${role}" not found in config`);
    }
    
    return {
      username: user.username,
      password: user.password,
      role: user.role
    };
  }

  /**
   * Generate test email
   */
  static generateTestEmail(): string {
    const timestamp = this.getTimestamp();
    return `test${timestamp}@example.com`;
  }

  /**
   * Generate test phone number
   */
  static generateTestPhoneNumber(): string {
    const area = Math.floor(Math.random() * 900) + 100;
    const exchange = Math.floor(Math.random() * 900) + 100;
    const number = Math.floor(Math.random() * 9000) + 1000;
    return `${area}-${exchange}-${number}`;
  }
}


