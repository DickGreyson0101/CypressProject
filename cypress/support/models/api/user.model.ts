/**
 * User API Models
 */

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  avatar?: string;
  balance?: number;
  createdAt: string;
  modifiedAt: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
}

export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  email: string;
  phoneNumber: string;
  avatar?: string;
  balance?: number;
}

export interface CreateUserResponse {
  user: User;
}

export interface UsersListResponse {
  results: User[];
  pageCount: number;
  hasNextPage: boolean;
}


