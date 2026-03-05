import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Category } from '../../shared/models/category';
import { Event, EventStatus } from '../../shared/models/event';
import { UserRole } from '../../shared/models/role';
import { User } from '../../shared/models/user';
import { Venue } from '../../shared/models/venue';

export interface EventPublishModalData {
  mode: 'create' | 'edit';
  categories: Category[];
  venues: Venue[];
  organizers: User[];
  canAssignOrganizer?: boolean;
  event?: Event;
  currentUserId?: number;
  currentUserRole?: UserRole;
}

export interface EventPublishModalResult {
  mode: 'create' | 'edit';
  payload: Partial<Event>;
}

@Component({
  selector: 'app-event-publish-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './event-publish-modal.html',
  styleUrls: ['./event-publish-modal.scss'],
})
export class EventPublishModal {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<EventPublishModal, EventPublishModalResult>);
  readonly data = inject<EventPublishModalData>(MAT_DIALOG_DATA);

  readonly canAssignOrganizer =
    this.data.canAssignOrganizer ?? this.data.currentUserRole === 'admin';
  readonly requiresOrganizerSelection =
    this.canAssignOrganizer && this.data.mode === 'create';

  readonly statuses: Array<{ value: EventStatus; label: string }> = [
    { value: 'borrador', label: 'Borrador' },
    { value: 'publicado', label: 'Publicado' },
    { value: 'cancelado', label: 'Cancelado' },
  ];

  readonly form = this.fb.group({
    title: [this.data.event?.title ?? '', [Validators.required, Validators.minLength(3)]],
    description: [this.data.event?.description ?? '', [Validators.required, Validators.minLength(10)]],
    organizer: [
      this.data.event?.organizer ??
        (this.canAssignOrganizer ? null : this.data.currentUserId ?? null),
      this.requiresOrganizerSelection ? Validators.required : [],
    ],
    category: [this.data.event?.category ?? null, Validators.required],
    venue: [this.data.event?.venue ?? null, Validators.required],
    max_capacity: [
      this.data.event?.max_capacity ?? 1,
      [Validators.required, Validators.min(1)],
    ],
    eventDate: [this.toDateInput(this.data.event?.start_datetime), Validators.required],
    eventTime: [this.toTimeInput(this.data.event?.start_datetime), Validators.required],
    status: [this.data.event?.status ?? 'borrador', Validators.required],
  });

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();
    const startDate = this.buildStartDateTime(
      formValue.eventDate ?? '',
      formValue.eventTime ?? ''
    );
    if (!startDate) {
      this.form.controls.eventDate.setErrors({ invalidDateTime: true });
      this.form.controls.eventTime.setErrors({ invalidDateTime: true });
      return;
    }
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const payload: Partial<Event> = {
      title: formValue.title ?? '',
      description: formValue.description ?? '',
      organizer: undefined,
      category: formValue.category ?? null,
      venue: formValue.venue ?? undefined,
      max_capacity: formValue.max_capacity ?? 1,
      start_datetime: startDate.toISOString(),
      end_datetime: endDate.toISOString(),
      status: formValue.status as EventStatus,
    };

    if (this.canAssignOrganizer) {
      payload.organizer = formValue.organizer ?? undefined;
    } else if (this.data.mode === 'create' && this.data.currentUserId) {
      payload.organizer = this.data.currentUserId;
    }

    if (this.data.mode === 'create') {
      payload.requirements = '';
      payload.modality = 'presencial';
      payload.is_public = true;
    }

    this.dialogRef.close({
      mode: this.data.mode,
      payload,
    });
  }

  private toDateInput(value?: string): string {
    if (!value) {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      return tomorrow.toISOString().slice(0, 10);
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toTimeInput(value?: string): string {
    if (!value) {
      return '09:00';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '09:00';
    }
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private buildStartDateTime(dateInput: string, timeInput: string): Date | null {
    if (!dateInput || !timeInput) {
      return null;
    }
    const parsed = new Date(`${dateInput}T${timeInput}:00`);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  }

  organizerLabel(user: User): string {
    const fullName = `${user.first_name} ${user.last_name}`.trim();
    if (fullName) {
      return fullName;
    }
    return user.username || user.email;
  }
}
