import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventPublishModal } from './event-publish-modal';

describe('EventPublishModal', () => {
  let component: EventPublishModal;
  let fixture: ComponentFixture<EventPublishModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventPublishModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventPublishModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
