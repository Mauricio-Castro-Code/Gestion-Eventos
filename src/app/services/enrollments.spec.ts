import { TestBed } from '@angular/core/testing';

import { Enrollments } from './enrollments';

describe('Enrollments', () => {
  let service: Enrollments;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Enrollments);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
