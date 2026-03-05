import { Component, computed, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { SidebarComponent } from '../../partials/sidebar/sidebar';
import { NavbarComponent } from '../../partials/navbar/navbar';
import { EventTableGlassComponent } from '../../partials/event-table-glass/event-table-glass.component';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter, finalize, forkJoin, of } from 'rxjs';
import { UserStateService } from '../../services/user-state.service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Events } from '../../services/events';
import { Users } from '../../services/users';
import { Categories } from '../../services/categories';
import { Venues } from '../../services/venues';
import { Enrollments } from '../../services/enrollments';
import { Event } from '../../shared/models/event';
import { Category } from '../../shared/models/category';
import { Venue } from '../../shared/models/venue';
import { Enrollment } from '../../shared/models/enrollment';
import { User } from '../../shared/models/user';
import {
  EventPublishModal,
  EventPublishModalData,
  EventPublishModalResult,
} from '../../modals/event-publish-modal/event-publish-modal';
import { Auth } from '../../services/auth';
import {
  ConfirmDeleteModal,
  ConfirmDeleteModalData,
} from '../../modals/confirm-delete-modal/confirm-delete-modal';

interface EventItem {
  id: number;
  enrollmentId: number;
  title: string;
  date: Date;
  time: string;
  location: string;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
}

interface HistoryItem {
  id: number;
  event: string;
  date: Date;
  attendance: 'Asistió' | 'No Asistió' | 'Cancelado';
}

interface DashboardEventRow {
  id: number;
  title: string;
  status: string;
  date: string;
  attendees: number;
  capacity: number;
  capacityPercentage: number;
}

interface StudentDiscoverEvent {
  id: number;
  title: string;
  date: Date;
  venue: string;
  category: string;
  slots: number;
}

interface StudentMyEvent {
  enrollmentId: number;
  eventId: number;
  title: string;
  date: Date;
  venue: string;
  status: Enrollment['status'];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatChipsModule,
    MatCardModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    BaseChartDirective,
    SidebarComponent,
    NavbarComponent,
    EventTableGlassComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly userState = inject(UserStateService);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly eventsService = inject(Events);
  private readonly usersService = inject(Users);
  private readonly categoriesService = inject(Categories);
  private readonly venuesService = inject(Venues);
  private readonly enrollmentsService = inject(Enrollments);
  private readonly auth = inject(Auth);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);

  @ViewChild('sidenav') sidenav!: MatSidenav;

  userRole = this.userState.userRole;

  isLoading = signal(true);
  sidebarOpen = signal(true);
  sidebarMode = signal<'over' | 'push' | 'side'>('side');
  showBackdrop = signal(false);
  showToast = signal(false);
  toastMessage = signal('Operación exitosa');
  showDashboardContent = signal(true);
  isCreatingCategory = signal(false);
  isCreatingVenue = signal(false);
  enrollingEventIds = signal<number[]>([]);

  totalUsers = signal(0);
  events = signal<Event[]>([]);
  studentEnrollments = signal<Enrollment[]>([]);
  categories = signal<Category[]>([]);
  venues = signal<Venue[]>([]);
  organizers = signal<User[]>([]);

  readonly categoryForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
  });

  readonly venueForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    location: ['', [Validators.required, Validators.minLength(2)]],
    capacity: [50, [Validators.required, Validators.min(1)]],
    address: [''],
  });

  allEvents = computed<DashboardEventRow[]>(() =>
    this.events().map((event) => {
      const attendees = event.attendees ?? event.enrolled_count ?? 0;
      const capacity = event.capacity ?? event.max_capacity;
      const percentage =
        event.capacityPercentage ??
        (capacity > 0 ? Math.round((attendees / capacity) * 100) : 0);

      return {
        id: event.id,
        title: event.title,
        status: event.status,
        date: event.start_datetime,
        attendees,
        capacity,
        capacityPercentage: percentage,
      };
    })
  );

  activeEventsCount = computed(
    () => this.events().filter((event) => event.status !== 'cancelado').length
  );

  occupancyRate = computed(() => {
    const activeEvents = this.events().filter((event) => event.status !== 'cancelado');
    const totalCapacity = activeEvents.reduce(
      (sum, event) => sum + (event.capacity ?? event.max_capacity),
      0
    );
    if (totalCapacity <= 0) {
      return 0;
    }
    const totalAttendees = activeEvents.reduce(
      (sum, event) => sum + (event.attendees ?? event.enrolled_count ?? 0),
      0
    );
    return Math.round((totalAttendees / totalCapacity) * 100);
  });

  activeSidebarEvents = computed(() =>
    this.events()
      .filter((event) => event.status !== 'cancelado')
      .map((event) => ({
        id: event.id,
        title: event.title,
        status: event.status,
      }))
  );

  agendaItems = computed<EventItem[]>(() => {
    const now = new Date();
    return this.studentEnrollments()
      .map((enrollment) => this.mapStudentEnrollment(enrollment))
      .filter(
        (item) =>
          item.status !== 'Cancelled' &&
          item.date >= now &&
          (item.status === 'Confirmed' || item.status === 'Pending')
      )
      .map((item) => ({
        id: item.id,
        enrollmentId: item.enrollmentId,
        title: item.title,
        date: item.date,
        time: item.time,
        location: item.location,
        status: item.status,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  historyItems = computed<HistoryItem[]>(() => {
    const now = new Date();
    return this.studentEnrollments()
      .map((enrollment) => this.mapStudentEnrollment(enrollment))
      .filter(
        (item) =>
          item.status === 'Cancelled' || item.date < now
      )
      .map((item): HistoryItem => ({
        id: item.id,
        event: item.title,
        date: item.date,
        attendance:
          item.status === 'Cancelled'
            ? 'Cancelado'
            : item.attended
            ? 'Asistió'
            : 'No Asistió',
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  });

  availableStudentEvents = computed<StudentDiscoverEvent[]>(() => {
    if (this.userRole() !== 'student') {
      return [];
    }

    const now = new Date();
    const enrolledEventIds = new Set(
      this.studentEnrollments()
        .filter((item) => item.status !== 'cancelled')
        .map((item) => item.eventId ?? item.event)
    );

    return this.events()
      .filter((event) => event.status === 'publicado')
      .filter((event) => !enrolledEventIds.has(event.id))
      .map((event) => {
        const eventDate = new Date(event.start_datetime);
        const deadline = event.registration_deadline
          ? new Date(event.registration_deadline)
          : null;
        const attendees = event.attendees ?? event.enrolled_count ?? 0;
        const capacity = event.capacity ?? event.max_capacity;
        return {
          id: event.id,
          title: event.title,
          date: eventDate,
          venue: event.venue_name || 'Sin sede',
          category: event.category_name || 'Sin categoría',
          slots: Math.max(capacity - attendees, 0),
          deadline,
        };
      })
      .filter((item) => !Number.isNaN(item.date.getTime()) && item.date >= now)
      .filter(
        (item) =>
          !item.deadline ||
          (!Number.isNaN(item.deadline.getTime()) && item.deadline >= now)
      )
      .filter((item) => item.slots > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(({ deadline: _deadline, ...item }) => item)
      .slice(0, 6);
  });

  myStudentEvents = computed<StudentMyEvent[]>(() => {
    if (this.userRole() !== 'student') {
      return [];
    }

    return this.studentEnrollments()
      .filter((item) => item.status !== 'cancelled')
      .map((item) => {
        const eventId = item.eventId ?? item.event;
        const fallbackEvent = this.events().find((event) => event.id === eventId);
        const date = item.event_start_datetime
          ? new Date(item.event_start_datetime)
          : fallbackEvent?.start_datetime
          ? new Date(fallbackEvent.start_datetime)
          : new Date(item.enrolled_at);

        return {
          enrollmentId: item.id,
          eventId,
          title: item.event_title || fallbackEvent?.title || `Evento #${eventId}`,
          date,
          venue: item.venue_name || fallbackEvent?.venue_name || 'Sin sede',
          status: item.status,
        };
      })
      .filter((item) => !Number.isNaN(item.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  displayedColumnsStudent: string[] = ['event', 'date', 'attendance'];

  nextEvent = {
    title: 'Hackathon 2026',
    date: new Date('2026-04-15T09:00:00'),
  };
  countdown = signal('');

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#1A237E' } },
    },
    scales: {
      x: { ticks: { color: '#64748B' }, grid: { color: 'rgba(0,0,0,0.05)' } },
      y: { ticks: { color: '#64748B' }, grid: { color: 'rgba(0,0,0,0.05)' } },
    },
  };
  public barChartType: ChartType = 'bar';
  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Eventos por categoría',
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
        ],
        borderColor: '#fff',
        borderWidth: 1,
      },
    ],
  };

  public doughnutChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#1A237E' } },
    },
  };
  public doughnutChartType: ChartType = 'doughnut';
  public doughnutChartData: ChartData<'doughnut'> = {
    labels: [],
    datasets: [
      {
        data: [],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  public lineChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    elements: {
      line: { tension: 0.4 },
    },
    scales: {
      x: { ticks: { color: '#64748B' }, grid: { color: 'rgba(0,0,0,0.05)' } },
      y: { ticks: { color: '#64748B' }, grid: { color: 'rgba(0,0,0,0.05)' } },
    },
    plugins: { legend: { labels: { color: '#1A237E' } } },
  };
  public lineChartType: ChartType = 'line';
  public lineChartData: ChartData<'line'> = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [28, 48, 40, 79, 86, 90],
        label: 'Enrollment Trends',
        backgroundColor: 'rgba(63, 81, 181, 0.3)',
        borderColor: '#7986cb',
        pointBackgroundColor: '#fff',
        pointBorderColor: '#fff',
        fill: true,
      },
    ],
  };

  constructor() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkRoute();
        if (this.sidebarMode() === 'over') {
          this.sidebarOpen.set(false);
        }
      });

    this.breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.Tablet])
      .subscribe((result) => {
        if (result.matches) {
          this.sidebarMode.set('over');
          this.sidebarOpen.set(false);
          this.showBackdrop.set(true);
        } else {
          this.sidebarMode.set('side');
          this.sidebarOpen.set(true);
          this.showBackdrop.set(false);
        }
      });
  }

  ngOnInit() {
    this.checkRoute();
    this.loadDashboardData();
    this.startTimer();
  }

  checkRoute() {
    const url = this.router.url;
    this.showDashboardContent.set(url === '/dashboard');
  }

  toggleSidebar() {
    this.sidebarOpen.update((value) => !value);
  }

  loadDashboardData() {
    this.isLoading.set(true);

    const role = this.userRole();
    const usersCountRequest =
      role === 'admin' || role === 'organizer'
        ? this.usersService.countActiveUsers()
        : of(0);
    const organizersRequest =
      role === 'admin'
        ? this.usersService.listAll({ role: 'organizer', is_active: true })
        : of([] as User[]);
    const enrollmentsRequest =
      role === 'student' ? this.enrollmentsService.listAll() : of([] as Enrollment[]);
    const catalogsRequest =
      role === 'admin' || role === 'organizer'
        ? forkJoin({
            categories: this.categoriesService.list(),
            venues: this.venuesService.list(),
          })
        : of({ categories: [] as Category[], venues: [] as Venue[] });

    forkJoin({
      events: this.eventsService.list(),
      enrollments: enrollmentsRequest,
      usersCount: usersCountRequest,
      organizers: organizersRequest,
      catalogs: catalogsRequest,
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ events, enrollments, usersCount, organizers, catalogs }) => {
          const currentUserId = this.auth.getCurrentUser()?.id;
          const scopedEvents =
            role === 'organizer' && currentUserId
              ? events.filter((event) => event.organizer === currentUserId)
              : events;

          this.events.set(scopedEvents);
          this.studentEnrollments.set(enrollments);
          this.totalUsers.set(usersCount);
          this.organizers.set(organizers);
          this.categories.set(catalogs.categories);
          this.venues.set(catalogs.venues);
          this.updateCharts(scopedEvents);
        },
        error: () => {
          this.events.set([]);
          this.studentEnrollments.set([]);
          this.totalUsers.set(0);
          this.organizers.set([]);
          this.triggerToast('No se pudieron cargar los datos del dashboard');
        },
      });
  }

  openCreateEventModal() {
    this.openEventModal('create');
  }

  openEditEventModal(eventRow: DashboardEventRow) {
    const event = this.events().find((item) => item.id === eventRow.id);
    if (!event) {
      return;
    }
    this.openEventModal('edit', event);
  }

  deleteEvent(eventRow: DashboardEventRow) {
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
          this.triggerToast('Evento eliminado');
          this.loadDashboardData();
        },
        error: () => this.triggerToast('No se pudo eliminar el evento'),
      });
    });
  }

  createCategory() {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    if (this.userRole() !== 'admin') {
      this.triggerToast('Solo admin puede crear categorías');
      return;
    }

    const raw = this.categoryForm.getRawValue();
    const name = raw.name.trim();
    if (!name) {
      this.categoryForm.controls.name.setErrors({ required: true });
      this.categoryForm.controls.name.markAsTouched();
      return;
    }

    this.isCreatingCategory.set(true);
    this.categoriesService
      .create({
        name,
        description: raw.description.trim() || undefined,
      })
      .pipe(finalize(() => this.isCreatingCategory.set(false)))
      .subscribe({
        next: (category) => {
          const isNew = this.upsertCategory(category);
          this.categoryForm.reset({
            name: '',
            description: '',
          });
          this.triggerToast(isNew ? 'Categoría creada' : 'Categoría existente reutilizada');
        },
        error: (error) => {
          this.triggerToast(
            this.extractErrorMessage(error, 'No se pudo crear la categoría')
          );
        },
      });
  }

  createVenue() {
    if (this.venueForm.invalid) {
      this.venueForm.markAllAsTouched();
      return;
    }
    if (this.userRole() !== 'admin') {
      this.triggerToast('Solo admin puede crear sedes');
      return;
    }

    const raw = this.venueForm.getRawValue();
    const name = raw.name.trim();
    const location = raw.location.trim();
    if (!name) {
      this.venueForm.controls.name.setErrors({ required: true });
      this.venueForm.controls.name.markAsTouched();
      return;
    }
    if (!location) {
      this.venueForm.controls.location.setErrors({ required: true });
      this.venueForm.controls.location.markAsTouched();
      return;
    }

    this.isCreatingVenue.set(true);
    this.venuesService
      .create({
        name,
        location,
        capacity: raw.capacity,
        address: raw.address.trim() || undefined,
      })
      .pipe(finalize(() => this.isCreatingVenue.set(false)))
      .subscribe({
        next: (venue) => {
          const isNew = this.upsertVenue(venue);
          this.venueForm.reset({
            name: '',
            location: '',
            capacity: 50,
            address: '',
          });
          this.triggerToast(isNew ? 'Sede creada' : 'Sede existente reutilizada');
        },
        error: (error) => {
          this.triggerToast(this.extractErrorMessage(error, 'No se pudo crear la sede'));
        },
      });
  }

  enrollFromDashboard(eventId: number) {
    if (this.userRole() !== 'student') {
      this.triggerToast('Solo estudiantes pueden inscribirse');
      return;
    }
    if (this.isEnrollingEvent(eventId)) {
      return;
    }

    this.enrollingEventIds.update((ids) =>
      ids.includes(eventId) ? ids : [...ids, eventId]
    );

    this.enrollmentsService
      .enroll(eventId)
      .pipe(
        finalize(() => {
          this.enrollingEventIds.update((ids) =>
            ids.filter((id) => id !== eventId)
          );
        })
      )
      .subscribe({
        next: (enrollment) => {
          this.studentEnrollments.update((current) => {
            const byIdIndex = current.findIndex((item) => item.id === enrollment.id);
            if (byIdIndex >= 0) {
              const updated = [...current];
              updated[byIdIndex] = enrollment;
              return updated;
            }

            const eventIdInEnrollment = enrollment.eventId ?? enrollment.event;
            const byEventIndex = current.findIndex(
              (item) => (item.eventId ?? item.event) === eventIdInEnrollment
            );
            if (byEventIndex >= 0) {
              const updated = [...current];
              updated[byEventIndex] = enrollment;
              return updated;
            }

            return [enrollment, ...current];
          });
          this.triggerToast('Inscripción completada');
        },
        error: (error) => {
          this.triggerToast(
            this.extractErrorMessage(error, 'No se pudo completar la inscripción')
          );
        },
      });
  }

  isEnrollingEvent(eventId: number): boolean {
    return this.enrollingEventIds().includes(eventId);
  }

  enrollmentStatusLabel(status: Enrollment['status']): string {
    if (status === 'pending') {
      return 'Pendiente';
    }
    if (status === 'cancelled') {
      return 'Cancelado';
    }
    return 'Confirmado';
  }

  private openEventModal(mode: 'create' | 'edit', event?: Event) {
    if (this.categories().length === 0 || this.venues().length === 0) {
      this.triggerToast('Primero crea categorías y venues para gestionar eventos');
      return;
    }
    if (mode === 'create' && this.userRole() === 'admin' && this.organizers().length === 0) {
      this.triggerToast('No hay organizadores registrados para asignar el evento');
      return;
    }

    const dialogData: EventPublishModalData = {
      mode,
      event,
      categories: this.categories(),
      venues: this.venues(),
      organizers: this.organizers(),
      canAssignOrganizer: this.userRole() === 'admin',
      currentUserId: this.auth.getCurrentUser()?.id,
      currentUserRole: this.userRole(),
    };

    const dialogRef = this.dialog.open(EventPublishModal, {
      width: '560px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result?: EventPublishModalResult) => {
      if (!result) {
        return;
      }

      if (result.mode === 'create') {
        this.eventsService.create(result.payload as any).subscribe({
          next: () => {
            this.triggerToast('Evento creado');
            this.loadDashboardData();
          },
          error: () => this.triggerToast('No se pudo crear el evento'),
        });
        return;
      }

      if (!event) {
        return;
      }
      this.eventsService.update(event.id, result.payload).subscribe({
        next: () => {
          this.triggerToast('Evento actualizado');
          this.loadDashboardData();
        },
        error: () => this.triggerToast('No se pudo actualizar el evento'),
      });
    });
  }

  private updateCharts(events: Event[]) {
    const activeEvents = events.filter((event) => event.status !== 'cancelado');
    const categoryCounter = new Map<string, number>();
    const venueCounter = new Map<string, number>();

    activeEvents.forEach((event) => {
      const categoryName = event.category_name || 'Sin categoría';
      const venueName = event.venue_name || 'Sin sede';

      categoryCounter.set(categoryName, (categoryCounter.get(categoryName) ?? 0) + 1);
      venueCounter.set(venueName, (venueCounter.get(venueName) ?? 0) + 1);
    });

    this.barChartData = {
      ...this.barChartData,
      labels: Array.from(categoryCounter.keys()),
      datasets: [
        {
          ...this.barChartData.datasets[0],
          data: Array.from(categoryCounter.values()),
        },
      ],
    };

    this.doughnutChartData = {
      ...this.doughnutChartData,
      labels: Array.from(venueCounter.keys()),
      datasets: [
        {
          ...this.doughnutChartData.datasets[0],
          data: Array.from(venueCounter.values()),
        },
      ],
    };
  }

  private upsertCategory(item: Category): boolean {
    let isNew = false;
    this.categories.update((current) => {
      const existingIndex = current.findIndex((entry) => entry.id === item.id);
      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex] = item;
        return this.sortCategories(updated);
      }
      isNew = true;
      return this.sortCategories([...current, item]);
    });
    return isNew;
  }

  private upsertVenue(item: Venue): boolean {
    let isNew = false;
    this.venues.update((current) => {
      const existingIndex = current.findIndex((entry) => entry.id === item.id);
      if (existingIndex >= 0) {
        const updated = [...current];
        updated[existingIndex] = item;
        return this.sortVenues(updated);
      }
      isNew = true;
      return this.sortVenues([...current, item]);
    });
    return isNew;
  }

  private sortCategories(items: Category[]): Category[] {
    return [...items].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }

  private sortVenues(items: Venue[]): Venue[] {
    return [...items].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
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

  triggerToast(message: string = 'Operación exitosa') {
    this.toastMessage.set(message);
    this.showToast.set(true);
    setTimeout(() => this.showToast.set(false), 3000);
  }

  startTimer() {
    setInterval(() => {
      const now = new Date().getTime();
      const distance = this.nextEvent.date.getTime() - now;
      if (distance < 0) {
        this.countdown.set('Event Started');
        return;
      }
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      this.countdown.set(`${days}d ${hours}h ${minutes}m`);
    }, 1000);
  }

  cancelBooking(enrollmentId: number) {
    this.enrollmentsService.cancel(enrollmentId).subscribe({
      next: () => {
        this.studentEnrollments.update((current) =>
          current.map((item) =>
            item.id === enrollmentId
              ? { ...item, status: 'cancelled', cancelled_at: new Date().toISOString() }
              : item
          )
        );
        this.triggerToast('Inscripción cancelada');
      },
      error: () => {
        this.triggerToast('No se pudo cancelar la inscripción');
      },
    });
  }

  private mapStudentEnrollment(enrollment: Enrollment): {
    id: number;
    enrollmentId: number;
    title: string;
    date: Date;
    time: string;
    location: string;
    status: 'Confirmed' | 'Pending' | 'Cancelled';
    attended: boolean;
  } {
    const date = enrollment.event_start_datetime
      ? new Date(enrollment.event_start_datetime)
      : new Date(enrollment.enrolled_at);

    const status =
      enrollment.status === 'pending'
        ? 'Pending'
        : enrollment.status === 'cancelled'
        ? 'Cancelled'
        : 'Confirmed';

    return {
      id: enrollment.eventId ?? enrollment.event,
      enrollmentId: enrollment.id,
      title: enrollment.event_title || `Evento #${enrollment.eventId ?? enrollment.event}`,
      date,
      time: date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      location: enrollment.venue_name || 'Sin sede',
      status,
      attended: enrollment.attended,
    };
  }
}
