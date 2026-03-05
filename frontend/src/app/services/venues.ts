import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { PaginatedResponse } from '../shared/models/api-response';
import { Venue } from '../shared/models/venue';

@Injectable({
  providedIn: 'root',
})
export class Venues {
  private readonly baseUrl = '/api/v1/venues/';

  constructor(private readonly http: HttpClient) {}

  list(): Observable<Venue[]> {
    return this.http
      .get<PaginatedResponse<Venue>>(this.baseUrl)
      .pipe(map((response) => response.results));
  }

  create(payload: {
    name: string;
    location: string;
    address?: string;
    capacity: number;
  }): Observable<Venue> {
    return this.http.post<Venue>(this.baseUrl, payload);
  }
}
