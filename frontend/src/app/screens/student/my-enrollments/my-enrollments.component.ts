import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Enrollments } from '../../../services/enrollments';
import { Enrollment } from '../../../shared/models/enrollment';

interface EnrollmentView {
  id: number;
  title: string;
  date: Date;
  venue: string;
  status: 'confirmed' | 'pending' | 'attended' | 'missed' | 'cancelled';
}

@Component({
  selector: 'app-my-enrollments',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
  ],
  templateUrl: './my-enrollments.component.html',
  styleUrls: ['./my-enrollments.component.scss'],
})
export class MyEnrollmentsComponent implements OnInit {
  private readonly enrollmentsService = inject(Enrollments);

  currentTab = signal<'upcoming' | 'history'>('upcoming');
  showModal = signal(false);
  selectedEnrollmentId = signal<number | null>(null);
  cancellationReason = signal('');
  isLoading = signal(true);
  serverError = signal<string | null>(null);

  enrollments = signal<EnrollmentView[]>([]);

  filteredEnrollments = computed(() => {
    const tab = this.currentTab();
    const now = new Date();

    return this.enrollments()
      .filter((item) => {
        if (tab === 'upcoming') {
          return (
            item.status !== 'cancelled' &&
            (item.status === 'confirmed' || item.status === 'pending') &&
            item.date >= now
          );
        }

        return item.status === 'cancelled' || item.status === 'attended' || item.status === 'missed' || item.date < now;
      })
      .sort((a, b) =>
        tab === 'upcoming'
          ? a.date.getTime() - b.date.getTime()
          : b.date.getTime() - a.date.getTime()
      );
  });

  stats = computed(() => {
    const now = new Date();
    const all = this.enrollments();
    const active = all.filter(
      (item) =>
        (item.status === 'confirmed' || item.status === 'pending') &&
        item.date >= now
    ).length;
    const attended = all.filter((item) => item.status === 'attended').length;
    return { active, attended };
  });

  ngOnInit(): void {
    this.loadEnrollments();
  }

  loadEnrollments(): void {
    this.isLoading.set(true);
    this.serverError.set(null);

    this.enrollmentsService
      .listAll()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (enrollments) => {
          const mapped = enrollments.map((item) => this.mapEnrollment(item));
          this.enrollments.set(mapped);
        },
        error: () => {
          this.enrollments.set([]);
          this.serverError.set('No se pudo cargar tu historial de inscripciones.');
        },
      });
  }

  switchTab(tab: 'upcoming' | 'history'): void {
    this.currentTab.set(tab);
  }

  initiateCancellation(id: number): void {
    this.selectedEnrollmentId.set(id);
    this.cancellationReason.set('');
    this.showModal.set(true);
  }

  cancelModal(): void {
    this.showModal.set(false);
    this.selectedEnrollmentId.set(null);
  }

  confirmCancellation(): void {
    const id = this.selectedEnrollmentId();
    if (!id) {
      return;
    }

    this.enrollmentsService.cancel(id).subscribe({
      next: () => {
        this.enrollments.update((list) =>
          list.map((item) => (item.id === id ? { ...item, status: 'cancelled' } : item))
        );
        this.cancelModal();
      },
      error: () => {
        this.serverError.set('No se pudo cancelar la inscripción.');
      },
    });
  }

  private mapEnrollment(enrollment: Enrollment): EnrollmentView {
    const eventDate = enrollment.event_start_datetime
      ? new Date(enrollment.event_start_datetime)
      : new Date(enrollment.enrolled_at);

    const now = new Date();
    const status = this.resolveStatus(enrollment, eventDate, now);

    return {
      id: enrollment.id,
      title: enrollment.event_title || `Evento #${enrollment.eventId ?? enrollment.event}`,
      date: eventDate,
      venue: enrollment.venue_name || 'Sin sede',
      status,
    };
  }

  private resolveStatus(
    enrollment: Enrollment,
    eventDate: Date,
    now: Date
  ): EnrollmentView['status'] {
    if (enrollment.status === 'cancelled') {
      return 'cancelled';
    }
    if (enrollment.attended) {
      return 'attended';
    }
    if (eventDate < now) {
      return 'missed';
    }
    if (enrollment.status === 'pending') {
      return 'pending';
    }
    return 'confirmed';
  }
}
