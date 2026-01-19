import { TestBed } from '@angular/core/testing';

import { Venues } from './venues';

describe('Venues', () => {
  let service: Venues;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Venues);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
