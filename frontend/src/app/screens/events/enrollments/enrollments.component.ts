import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Events } from '../../../services/events';
import { Enrollments } from '../../../services/enrollments';
import { Enrollment } from '../../../shared/models/enrollment';
import { Event as EventModel } from '../../../shared/models/event';
import {
  ConfirmDeleteModal,
  ConfirmDeleteModalData,
} from '../../../modals/confirm-delete-modal/confirm-delete-modal';

interface EnrollmentRow {
  id: number;
  eventId: number;
  name: string;
  email: string;
  enrolledAt: Date;
  status: 'confirmed' | 'pending' | 'cancelled';
  attended: boolean;
}

@Component({
    selector: 'app-enrollments',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatMenuModule, MatDialogModule],
    templateUrl: './enrollments.component.html',
    styleUrls: ['./enrollments.component.scss']
})
export class EnrollmentsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly eventsService = inject(Events);
  private readonly enrollmentsService = inject(Enrollments);

  event = signal<EventModel | null>(null);
  rows = signal<EnrollmentRow[]>([]);
  isLoading = signal<boolean>(true);
  serverError = signal<string | null>(null);

  totalInscritos = computed(() => this.rows().filter((row) => row.status !== 'cancelled').length);
  cupo = computed(() => this.event()?.max_capacity ?? 0);
  totalAsistieron = computed(
    () =>
      this.rows().filter((row) => row.status !== 'cancelled' && row.attended).length
  );

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const eventId = Number(idParam);

    if (!Number.isFinite(eventId) || eventId <= 0) {
      this.serverError.set('El evento solicitado no es válido.');
      this.isLoading.set(false);
      return;
    }

    this.loadData(eventId);
  }

  toggleAttendance(row: EnrollmentRow): void {
    if (row.status === 'cancelled') {
      return;
    }

    const attended = !row.attended;
    this.rows.update((list) =>
      list.map((item) => (item.id === row.id ? { ...item, attended } : item))
    );

    this.enrollmentsService.markAttendance(row.id, attended).subscribe({
      next: () => {
        if (attended) {
          this.triggerPulse();
        }
      },
      error: () => {
        this.rows.update((list) =>
          list.map((item) => (item.id === row.id ? { ...item, attended: row.attended } : item))
        );
        this.serverError.set('No se pudo actualizar la asistencia.');
      },
    });
  }

  openCancelModal(row: EnrollmentRow): void {
    if (row.status === 'cancelled') {
      return;
    }

    const dialogData: ConfirmDeleteModalData = {
      title: 'Cancelar inscripción',
      message: `¿Estás seguro que deseas cancelar la inscripción de "${row.name}"?`,
      confirmLabel: 'Sí, cancelar',
      cancelLabel: 'No',
    };
    const dialogRef = this.dialog.open(ConfirmDeleteModal, {
      width: '420px',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.enrollmentsService.cancel(row.id).subscribe({
        next: () => {
          this.rows.update((list) =>
            list.map((item) =>
              item.id === row.id ? { ...item, status: 'cancelled', attended: false } : item
            )
          );
        },
        error: () => {
          this.serverError.set('No se pudo cancelar la inscripción.');
        },
      });
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'pending':
        return 'Pendiente';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  }

  private loadData(eventId: number): void {
    this.isLoading.set(true);
    this.serverError.set(null);

    forkJoin({
      event: this.eventsService.getById(eventId),
      enrollments: this.enrollmentsService.listByEvent(eventId),
    }).subscribe({
      next: ({ event, enrollments }) => {
        this.event.set(event);
        this.rows.set(
          enrollments
            .filter((item) => (item.eventId ?? item.event) === eventId)
            .map((item) => this.toRow(item))
        );
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.serverError.set(this.extractErrorMessage(error));
        this.rows.set([]);
        this.isLoading.set(false);
      },
    });
  }

  private toRow(enrollment: Enrollment): EnrollmentRow {
    const name =
      enrollment.student_name?.trim() ||
      enrollment.student_username?.trim() ||
      `Usuario #${enrollment.studentId ?? enrollment.student}`;
    const email = enrollment.student_email?.trim() || 'Sin correo';

    return {
      id: enrollment.id,
      eventId: enrollment.eventId ?? enrollment.event,
      name,
      email,
      enrolledAt: new Date(enrollment.enrolled_at),
      status: enrollment.status,
      attended: enrollment.attended,
    };
  }

  private triggerPulse(): void {
    const el = document.querySelector('.metric.asistieron');
    if (!el) {
      return;
    }
    el.classList.remove('pulse');
    void (el as HTMLElement).offsetWidth;
    el.classList.add('pulse');
  }

  private extractErrorMessage(error: HttpErrorResponse): string {
    const body = error.error as { detail?: string } | string | null;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (body && typeof body === 'object' && body.detail) {
      return body.detail;
    }
    return 'No se pudo cargar la lista de inscripciones del evento.';
  }
}
