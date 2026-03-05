import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of, switchMap } from 'rxjs';
import { PaginatedResponse } from '../shared/models/api-response';
import { Enrollment } from '../shared/models/enrollment';

@Injectable({
  providedIn: 'root',
})
export class Enrollments {
  private readonly baseUrl = '/api/v1/enrollments/';

  constructor(private readonly http: HttpClient) {}

  list(params?: Record<string, string | number | boolean>): Observable<Enrollment[]> {
    return this.http
      .get<PaginatedResponse<Enrollment>>(this.baseUrl, { params: this.toParams(params) })
      .pipe(map((response) => response.results));
  }

  listAll(params?: Record<string, string | number | boolean>): Observable<Enrollment[]> {
    return this.fetchAllPages(1, params, []);
  }

  enroll(eventId: number): Observable<Enrollment> {
    return this.http.post<Enrollment>(this.baseUrl, { event: eventId });
  }

  listByEvent(eventId: number): Observable<Enrollment[]> {
    return this.listAll({ event: eventId });
  }

  markAttendance(enrollmentId: number, attended: boolean): Observable<Enrollment> {
    return this.http.post<Enrollment>(`${this.baseUrl}${enrollmentId}/mark_attendance/`, {
      attended,
    });
  }

  cancel(enrollmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}${enrollmentId}/`);
  }

  private fetchAllPages(
    page: number,
    params: Record<string, string | number | boolean> | undefined,
    accumulated: Enrollment[]
  ): Observable<Enrollment[]> {
    const requestParams = { ...(params ?? {}), page };
    return this.http
      .get<PaginatedResponse<Enrollment>>(this.baseUrl, { params: this.toParams(requestParams) })
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
