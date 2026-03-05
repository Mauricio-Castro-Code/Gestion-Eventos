import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Category } from '../shared/models/category';
import { PaginatedResponse } from '../shared/models/api-response';

@Injectable({
  providedIn: 'root',
})
export class Categories {
  private readonly baseUrl = '/api/v1/categories/';

  constructor(private readonly http: HttpClient) {}

  list(): Observable<Category[]> {
    return this.http
      .get<PaginatedResponse<Category>>(this.baseUrl)
      .pipe(map((response) => response.results));
  }

  create(payload: { name: string; description?: string }): Observable<Category> {
    return this.http.post<Category>(this.baseUrl, payload);
  }
}
