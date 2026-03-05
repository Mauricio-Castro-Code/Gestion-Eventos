import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of, switchMap } from 'rxjs';
import { Event } from '../shared/models/event';
import { PaginatedResponse } from '../shared/models/api-response';

@Injectable({
  providedIn: 'root',
})
export class Events {
  private readonly baseUrl = '/api/v1/events/';

  constructor(private readonly http: HttpClient) {}

  list(params?: Record<string, string | number | boolean>): Observable<Event[]> {
    return this.http
      .get<PaginatedResponse<Event>>(this.baseUrl, { params: this.toParams(params) })
      .pipe(map((response) => response.results));
  }

  listAll(params?: Record<string, string | number | boolean>): Observable<Event[]> {
    return this.fetchAllPages(1, params, []);
  }

  getById(id: number): Observable<Event> {
    return this.http.get<Event>(`${this.baseUrl}${id}/`);
  }

  create(payload: Partial<Event> & { title: string; venue: number; max_capacity: number }): Observable<Event> {
    return this.http.post<Event>(this.baseUrl, payload);
  }

  update(id: number, payload: Partial<Event>): Observable<Event> {
    return this.http.patch<Event>(`${this.baseUrl}${id}/`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${id}/`);
  }

  private fetchAllPages(
    page: number,
    params: Record<string, string | number | boolean> | undefined,
    accumulated: Event[]
  ): Observable<Event[]> {
    const requestParams = { ...(params ?? {}), page };
    return this.http
      .get<PaginatedResponse<Event>>(this.baseUrl, { params: this.toParams(requestParams) })
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
