import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of, switchMap } from 'rxjs';
import { PaginatedResponse } from '../shared/models/api-response';
import { User } from '../shared/models/user';

@Injectable({
  providedIn: 'root',
})
export class Users {
  private readonly baseUrl = '/api/v1/users/';

  constructor(private readonly http: HttpClient) {}

  list(params?: Record<string, string | number | boolean>): Observable<PaginatedResponse<User>> {
    return this.http.get<PaginatedResponse<User>>(this.baseUrl, {
      params: this.toParams(params),
    });
  }

  listAll(params?: Record<string, string | number | boolean>): Observable<User[]> {
    return this.fetchAllPages(1, params, []);
  }

  update(id: number, payload: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}${id}/`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`);
  }

  countActiveUsers(): Observable<number> {
    return this.list({ is_active: true }).pipe(map((response) => response.count));
  }

  private fetchAllPages(
    page: number,
    params: Record<string, string | number | boolean> | undefined,
    accumulated: User[]
  ): Observable<User[]> {
    const requestParams = { ...(params ?? {}), page };
    return this.http
      .get<PaginatedResponse<User>>(this.baseUrl, { params: this.toParams(requestParams) })
      .pipe(
        switchMap((response) => {
          const merged = accumulated.concat(response.results);
          if (!response.next) {
            return of(merged);
          }
          return this.fetchAllPages(page + 1, params, merged);
        })
      );
  }

  private toParams(
    params?: Record<string, string | number | boolean>
  ): Record<string, string> {
    if (!params) {
      return {};
    }
    return Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {});
  }
}
