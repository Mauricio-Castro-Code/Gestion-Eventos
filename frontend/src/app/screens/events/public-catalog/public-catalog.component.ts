import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize, forkJoin, of } from 'rxjs';
import { Events } from '../../../services/events';
import { Event as EventModel } from '../../../shared/models/event';
import { Enrollments } from '../../../services/enrollments';
import { Auth } from '../../../services/auth';
import { Enrollment } from '../../../shared/models/enrollment';
import { UserStateService } from '../../../services/user-state.service';

interface CatalogEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  dateIso: string;
  category: string;
  venue: string;
  status: string;
  image: string;
  description: string;
  slots: number;
  isPast: boolean;
  deadlinePassed: boolean;
  isPublished: boolean;
  isFull: boolean;
}

@Component({
  selector: 'app-public-catalog',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './public-catalog.component.html',
  styleUrl: './public-catalog.component.scss',
})
export class PublicCatalogComponent implements OnInit {
  private readonly eventsService = inject(Events);
  private readonly enrollmentsService = inject(Enrollments);
  private readonly auth = inject(Auth);
  private readonly userState = inject(UserStateService);
  private readonly router = inject(Router);

  isLoading = signal<boolean>(true);
  isEnrollingIds = signal<number[]>([]);
  serverError = signal<string | null>(null);
  events = signal<CatalogEvent[]>([]);
  filteredEvents = signal<CatalogEvent[]>([]);
  studentEnrollments = signal<Enrollment[]>([]);
  searchTerm = signal<string>('');

  isAuthenticated = computed(() => this.auth.isAuthenticated());
  userRole = this.userState.userRole;
  isStudent = computed(() => this.isAuthenticated() && this.userRole() === 'student');
  enrolledEventIds = computed(() =>
    new Set(
      this.studentEnrollments()
        .filter((item) => item.status !== 'cancelled')
        .map((item) => item.eventId ?? item.event)
    )
  );

  ngOnInit(): void {
    this.loadEvents();
  }

  goToLogin(): void {
    void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/catalog' } });
  }

  onEnroll(eventId: number): void {
    if (!this.isAuthenticated()) {
      this.goToLogin();
      return;
    }
    if (!this.isStudent()) {
      return;
    }
    if (this.enrolledEventIds().has(eventId)) {
      return;
    }
    const event = this.events().find((item) => item.id === eventId);
    if (!event || !this.canEnroll(event) || this.isEnrolling(eventId)) {
      return;
    }

    this.isEnrollingIds.update((ids) => (ids.includes(eventId) ? ids : [...ids, eventId]));

    this.enrollmentsService
      .enroll(eventId)
      .pipe(
        finalize(() =>
          this.isEnrollingIds.update((ids) => ids.filter((id) => id !== eventId))
        )
      )
      .subscribe({
        next: (enrollment) => {
          this.studentEnrollments.update((current) => [enrollment, ...current]);
          this.refreshEventAvailability(eventId);
        },
        error: (error) => {
          this.serverError.set(this.extractErrorMessage(error, 'No se pudo completar la inscripción.'));
          this.loadEvents();
        },
      });
  }

  isEnrolling(eventId: number): boolean {
    return this.isEnrollingIds().includes(eventId);
  }

  canEnroll(event: CatalogEvent): boolean {
    return (
      this.isStudent() &&
      event.isPublished &&
      !event.isPast &&
      !event.deadlinePassed &&
      !event.isFull
    );
  }

  enrollButtonLabel(event: CatalogEvent): string {
    if (!this.isAuthenticated()) {
      return 'Inicia sesión';
    }
    if (!this.isStudent()) {
      return 'Solo estudiantes';
    }
    if (this.enrolledEventIds().has(event.id)) {
      return 'Inscrito';
    }
    if (this.isEnrolling(event.id)) {
      return 'Inscribiendo...';
    }
    if (!event.isPublished) {
      return 'No disponible';
    }
    if (event.isPast || event.deadlinePassed) {
      return 'Registro cerrado';
    }
    if (event.isFull) {
      return 'Sin cupo';
    }
    return 'Inscribirme';
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.applyFilter(input.value);
  }

  private loadEvents(): void {
    this.isLoading.set(true);
    this.serverError.set(null);

    const enrollmentsRequest = this.isStudent()
      ? this.enrollmentsService.listAll()
      : of([] as Enrollment[]);

    forkJoin({
      events: this.eventsService.listAll(),
      enrollments: enrollmentsRequest,
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ events, enrollments }) => {
          this.studentEnrollments.set(enrollments);
          const mapped = this.sortCatalogEvents(events.map((event) => this.toCatalogEvent(event)));
          this.events.set(mapped);
          this.applyFilter(this.searchTerm());
        },
        error: (error) => {
          this.events.set([]);
          this.filteredEvents.set([]);
          this.serverError.set(this.extractErrorMessage(error, 'No se pudieron cargar los eventos.'));
        },
      });
  }

  private applyFilter(value: string): void {
    const query = value.trim().toLowerCase();
    if (!query) {
      this.filteredEvents.set(this.events());
      return;
    }

    this.filteredEvents.set(
      this.events().filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.category.toLowerCase().includes(query) ||
          event.venue.toLowerCase().includes(query)
      )
    );
  }

  private toCatalogEvent(event: EventModel): CatalogEvent {
    const now = new Date();
    const dateObj = new Date(event.start_datetime);
    const deadline = event.registration_deadline
      ? new Date(event.registration_deadline)
      : null;
    const attendees = event.attendees ?? event.enrolled_count ?? 0;
    const capacity = event.capacity ?? event.max_capacity;
    const slots = Math.max(capacity - attendees, 0);

    return {
      id: event.id,
      title: event.title,
      date: dateObj.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      time: dateObj.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      dateIso: event.start_datetime,
      category: event.category_name || 'Sin categoría',
      venue: event.venue_name || 'Sin sede',
      status: event.statusLabel || 'Programado',
      image:
        event.image_url ||
        'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800',
      description: event.description || 'Sin descripción',
      slots,
      isPast: !Number.isNaN(dateObj.getTime()) && dateObj <= now,
      deadlinePassed:
        !!deadline && !Number.isNaN(deadline.getTime()) && deadline < now,
      isPublished: event.status === 'publicado',
      isFull: slots <= 0,
    };
  }

  private sortCatalogEvents(events: CatalogEvent[]): CatalogEvent[] {
    const upcoming = events
      .filter((event) => !event.isPast)
      .sort((a, b) => new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime());
    const past = events
      .filter((event) => event.isPast)
      .sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime());
    return [...upcoming, ...past];
  }

  private refreshEventAvailability(eventId: number): void {
    this.events.update((current) =>
      current.map((event) =>
        event.id === eventId
          ? {
              ...event,
              slots: Math.max(event.slots - 1, 0),
              isFull: event.slots - 1 <= 0,
            }
          : event
      )
    );
    this.applyFilter(this.searchTerm());
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error.trim();
    }
    if (error.error && typeof error.error === 'object') {
      const detail = (error.error as { detail?: unknown }).detail;
      if (typeof detail === 'string' && detail.trim()) {
        return detail.trim();
      }
      for (const value of Object.values(error.error as Record<string, unknown>)) {
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
        if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
          return value[0].trim();
        }
      }
    }
    return fallback;
  }
}
