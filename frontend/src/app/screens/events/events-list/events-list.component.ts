import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { EventCardGlassComponent } from '../../../partials/event-card-glass/event-card-glass.component';
import { EventTableGlassComponent } from '../../../partials/event-table-glass/event-table-glass.component';
import { FilterBarGlassComponent } from '../../../partials/filter-bar-glass/filter-bar-glass.component';
import { UserStateService } from '../../../services/user-state.service';
import { Events } from '../../../services/events';
import { Enrollments } from '../../../services/enrollments';
import { Categories } from '../../../services/categories';
import { Venues } from '../../../services/venues';
import { Auth } from '../../../services/auth';
import { Event } from '../../../shared/models/event';
import { Enrollment } from '../../../shared/models/enrollment';
import { Category } from '../../../shared/models/category';
import { Venue } from '../../../shared/models/venue';
import {
  ConfirmDeleteModal,
  ConfirmDeleteModalData,
} from '../../../modals/confirm-delete-modal/confirm-delete-modal';
import {
  EventPublishModal,
  EventPublishModalData,
  EventPublishModalResult,
} from '../../../modals/event-publish-modal/event-publish-modal';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    EventCardGlassComponent,
    EventTableGlassComponent,
    FilterBarGlassComponent,
  ],
  templateUrl: './events-list.component.html',
  styleUrl: './events-list.component.scss',
})
export class EventsListComponent implements OnInit {
  private readonly userState = inject(UserStateService);
  private readonly eventsService = inject(Events);
  private readonly enrollmentsService = inject(Enrollments);
  private readonly categoriesService = inject(Categories);
  private readonly venuesService = inject(Venues);
  private readonly auth = inject(Auth);
  private readonly dialog = inject(MatDialog);

  userRole = this.userState.userRole;

  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  serverError = signal<string | null>(null);
  events = signal<any[]>([]);
  filteredEvents = signal<any[]>([]);
  activeEnrollmentByEvent = signal<Record<number, Enrollment>>({});
  categories = signal<Category[]>([]);
  venues = signal<Venue[]>([]);

  constructor() {
    effect(() => {
      // Keep behavior visible in dev mode for role-based views.
      console.log(`Current Role View: ${this.userRole()}`);
    });
  }

  ngOnInit() {
    this.loadEvents();
  }

  loadEvents() {
    this.isLoading.set(true);
    this.serverError.set(null);

    forkJoin({
      events: this.eventsService.listAll(),
      enrollments:
        this.userRole() === 'student'
          ? this.enrollmentsService.listAll()
          : of([] as Enrollment[]),
      catalogs:
        this.userRole() === 'admin' || this.userRole() === 'organizer'
          ? forkJoin({
              categories: this.categoriesService.list(),
              venues: this.venuesService.list(),
            })
          : of({ categories: [] as Category[], venues: [] as Venue[] }),
    }).subscribe({
      next: ({ events, enrollments, catalogs }) => {
        const activeMap = this.buildActiveEnrollmentMap(enrollments as Enrollment[]);
        this.activeEnrollmentByEvent.set(activeMap);
        this.categories.set(catalogs.categories);
        this.venues.set(catalogs.venues);

        const currentUserId = this.userState.user()?.id ?? null;
        const sourceEvents =
          this.userRole() === 'organizer' && currentUserId
            ? events.filter((event) => event.organizer === currentUserId)
            : events;

        const mapped = sourceEvents.map((event) => this.mapEvent(event, activeMap));
        this.events.set(mapped);
        this.filteredEvents.set(mapped);
        this.isLoading.set(false);
      },
      error: () => {
        this.events.set([]);
        this.filteredEvents.set([]);
        this.isLoading.set(false);
        this.serverError.set('No se pudo cargar el catálogo de eventos.');
      },
    });
  }

  onFilterChange(query: string) {
    if (!query) {
      this.filteredEvents.set(this.events());
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = this.events().filter(
      (event) =>
        String(event.title).toLowerCase().includes(lowerQuery) ||
        String(event.organizer || '').toLowerCase().includes(lowerQuery) ||
        String(event.status).toLowerCase().includes(lowerQuery)
    );
    this.filteredEvents.set(filtered);
  }

  onEnroll(eventId: number) {
    if (this.userRole() !== 'student') {
      return;
    }

    const event = this.events().find((item) => item.id === eventId);
    if (!event || event.isEnrollDisabled) {
      return;
    }

    this.isSubmitting.set(true);
    this.serverError.set(null);
    this.enrollmentsService.enroll(eventId).subscribe({
      next: (enrollment) => {
        this.activeEnrollmentByEvent.update((current) => ({
          ...current,
          [eventId]: enrollment,
        }));

        this.events.update((items) =>
          items.map((item) =>
            item.id === eventId
              ? {
                  ...item,
                  isEnrolled: true,
                  attendees: item.attendees + 1,
                  capacityPercentage:
                    item.capacity > 0
                      ? Math.round(((item.attendees + 1) / item.capacity) * 100)
                      : item.capacityPercentage,
                }
              : item
          )
        );
        this.filteredEvents.update((items) =>
          items.map((item) =>
            item.id === eventId
              ? {
                  ...item,
                  isEnrolled: true,
                  attendees: item.attendees + 1,
                  capacityPercentage:
                    item.capacity > 0
                      ? Math.round(((item.attendees + 1) / item.capacity) * 100)
                      : item.capacityPercentage,
                }
              : item
          )
        );
        this.isSubmitting.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.serverError.set(this.extractErrorMessage(error));
        this.isSubmitting.set(false);
      },
    });
  }

  onEditEvent(eventRow: { id: number }): void {
    if (this.categories().length === 0 || this.venues().length === 0) {
      this.serverError.set('Primero crea categorías y sedes para editar eventos.');
      return;
    }

    this.serverError.set(null);
    this.eventsService.getById(eventRow.id).subscribe({
      next: (event) => {
        const dialogData: EventPublishModalData = {
          mode: 'edit',
          event,
          categories: this.categories(),
          venues: this.venues(),
          organizers: [],
          canAssignOrganizer: this.userRole() === 'admin',
          currentUserId: this.auth.getCurrentUser()?.id,
          currentUserRole: this.userRole(),
        };
        this.openEventModal(dialogData, event.id);
      },
      error: (error: HttpErrorResponse) => {
        this.serverError.set(this.extractErrorMessage(error));
      },
    });
  }

  onDeleteEvent(eventRow: { id: number; title: string }): void {
    const dialogData: ConfirmDeleteModalData = {
      title: 'Eliminar evento',
      message: `¿Estás seguro que deseas eliminar "${eventRow.title}"?`,
      confirmLabel: 'Sí, eliminar',
      cancelLabel: 'Cancelar',
    };

    const dialogRef = this.dialog.open(ConfirmDeleteModal, {
      width: '420px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.eventsService.delete(eventRow.id).subscribe({
        next: () => {
          this.triggerSuccessState(eventRow.id);
          this.serverError.set(null);
        },
        error: (error: HttpErrorResponse) => {
          this.serverError.set(this.extractErrorMessage(error));
        },
      });
    });
  }

  private mapEvent(event: Event, activeEnrollmentMap: Record<number, Enrollment>): any {
    const attendees = event.attendees ?? event.enrolled_count ?? 0;
    const capacity = event.capacity ?? event.max_capacity;
    const capacityPercentage =
      event.capacityPercentage ??
      (capacity > 0 ? Math.round((attendees / capacity) * 100) : 0);
    const now = new Date();
    const eventStart = new Date(event.start_datetime);
    const deadline = event.registration_deadline ? new Date(event.registration_deadline) : null;

    const isEnrolled = !!activeEnrollmentMap[event.id];
    const isFull = capacity > 0 && attendees >= capacity;
    const isStarted = eventStart <= now;
    const isRegistrationClosed = deadline ? deadline < now : false;
    const isPublished = event.status === 'publicado';
    const isEnrollDisabled =
      isEnrolled || isFull || isStarted || isRegistrationClosed || !isPublished;
    const enrollLabel = isEnrolled
      ? 'Ya inscrito'
      : isFull
      ? 'Sin cupo'
      : isStarted
      ? 'Evento iniciado'
      : isRegistrationClosed
      ? 'Registro cerrado'
      : !isPublished
      ? 'No disponible'
      : 'Inscribirme';

    return {
      id: event.id,
      title: event.title,
      date: event.start_datetime,
      time: new Date(event.start_datetime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      organizer: event.organizer_name || 'Sin organizador',
      image:
        event.image_url ||
        'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=800',
      capacity,
      attendees,
      capacityPercentage,
      status: event.status,
      description: event.description || 'Sin descripción',
      isEnrolled,
      isFull,
      isEnrollDisabled,
      enrollLabel,
    };
  }

  private buildActiveEnrollmentMap(enrollments: Enrollment[]): Record<number, Enrollment> {
    return enrollments.reduce<Record<number, Enrollment>>((acc, enrollment) => {
      if (enrollment.status === 'cancelled') {
        return acc;
      }
      const eventId = enrollment.eventId ?? enrollment.event;
      acc[eventId] = enrollment;
      return acc;
    }, {});
  }

  private triggerSuccessState(eventId: number): void {
    this.events.update((items) => items.filter((item) => item.id !== eventId));
    this.filteredEvents.update((items) => items.filter((item) => item.id !== eventId));
  }

  private openEventModal(dialogData: EventPublishModalData, eventId: number): void {
    const dialogRef = this.dialog.open(EventPublishModal, {
      width: '560px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result?: EventPublishModalResult) => {
      if (!result) {
        return;
      }

      this.eventsService.update(eventId, result.payload).subscribe({
        next: () => {
          this.loadEvents();
        },
        error: (error: HttpErrorResponse) => {
          this.serverError.set(this.extractErrorMessage(error));
        },
      });
    });
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const body = error.error as
      | { detail?: string; non_field_errors?: string[]; [key: string]: unknown }
      | string
      | null;

    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (body && typeof body === 'object') {
      if (body.detail) {
        return body.detail;
      }
      if (body.non_field_errors?.length) {
        return body.non_field_errors[0];
      }
      const eventErrors = body['event'];
      if (Array.isArray(eventErrors) && eventErrors.length > 0) {
        return String(eventErrors[0]);
      }
      if (typeof eventErrors === 'string' && eventErrors.trim()) {
        return eventErrors;
      }
      const firstKey = Object.keys(body)[0];
      if (firstKey) {
        const value = body[firstKey];
        if (Array.isArray(value) && value.length > 0) {
          return String(value[0]);
        }
        if (typeof value === 'string' && value.trim()) {
          return value;
        }
      }
    }

    return 'No se pudo completar la inscripción para este evento.';
  }
}
