import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoleChangeModal } from './role-change-modal';

describe('RoleChangeModal', () => {
  let component: RoleChangeModal;
  let fixture: ComponentFixture<RoleChangeModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleChangeModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoleChangeModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
