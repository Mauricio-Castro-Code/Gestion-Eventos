import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User } from '../shared/models/user';
import { UserRole } from '../shared/models/role';
import { UserStateService } from './user-state.service';

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  workerId?: string;
  adminKey?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

const ACCESS_TOKEN_KEY = 'gtea_access_token';
const REFRESH_TOKEN_KEY = 'gtea_refresh_token';
const USER_KEY = 'gtea_user';
const API_BASE_URL = '/api/v1';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  constructor(
    private readonly http: HttpClient,
    private readonly userState: UserStateService
  ) {
    this.restoreSession();
  }

  register(payload: RegisterRequest): Observable<User> {
    return this.http.post<User>(`${API_BASE_URL}/auth/register/`, payload);
  }

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${API_BASE_URL}/auth/login/`, payload)
      .pipe(tap((response) => this.persistSession(response)));
  }

  me(): Observable<User> {
    return this.http
      .get<User>(`${API_BASE_URL}/auth/me/`)
      .pipe(tap((user) => this.userState.setUser(user)));
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.userState.clear();
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  getCurrentRole(): UserRole | null {
    return this.userState.user()?.role ?? null;
  }

  getCurrentUser(): User | null {
    return this.userState.user();
  }

  private persistSession(response: LoginResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, response.access);
    localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this.userState.setUser(response.user);
  }

  private restoreSession(): void {
    const userJson = localStorage.getItem(USER_KEY);
    if (!userJson) {
      return;
    }

    try {
      const user = JSON.parse(userJson) as User;
      this.userState.setUser(user);
    } catch {
      this.logout();
    }
  }
}
