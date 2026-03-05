import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToastAlerts } from './toast-alerts';

describe('ToastAlerts', () => {
  let component: ToastAlerts;
  let fixture: ComponentFixture<ToastAlerts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastAlerts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ToastAlerts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
