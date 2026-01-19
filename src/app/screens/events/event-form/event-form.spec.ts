
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EventForm } from './event-form';
import { provideRouter } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('EventForm', () => {
  let component: EventForm;
  let fixture: ComponentFixture<EventForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventForm, BrowserAnimationsModule],
      providers: [provideRouter([])]
    })
      .compileComponents();

    fixture = TestBed.createComponent(EventForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
