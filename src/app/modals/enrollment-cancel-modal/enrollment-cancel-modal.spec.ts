import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnrollmentCancelModal } from './enrollment-cancel-modal';

describe('EnrollmentCancelModal', () => {
  let component: EnrollmentCancelModal;
  let fixture: ComponentFixture<EnrollmentCancelModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnrollmentCancelModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnrollmentCancelModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
