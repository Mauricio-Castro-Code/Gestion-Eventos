import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmDeleteModal } from './confirm-delete-modal';

describe('ConfirmDeleteModal', () => {
  let component: ConfirmDeleteModal;
  let fixture: ComponentFixture<ConfirmDeleteModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDeleteModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmDeleteModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
