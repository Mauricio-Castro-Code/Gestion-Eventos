import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmActionModal } from './confirm-action-modal';

describe('ConfirmActionModal', () => {
  let component: ConfirmActionModal;
  let fixture: ComponentFixture<ConfirmActionModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmActionModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmActionModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
