import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, computed, HostBinding, inject, OnInit, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, finalize, forkJoin, map, of, switchMap } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Categories } from '../../../services/categories';
import { Events } from '../../../services/events';
import { Venues } from '../../../services/venues';
import { Category } from '../../../shared/models/category';
import { Event as EventModel, EventStatus } from '../../../shared/models/event';
import { Venue } from '../../../shared/models/venue';

const NEW_OPTION = '__new__' as const;
type SelectValue = number | typeof NEW_OPTION | null;

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './event-form.html',
  styleUrl: './event-form.scss',
})
export class EventForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly categoriesService = inject(Categories);
  private readonly venuesService = inject(Venues);
  private readonly eventsService = inject(Events);

  readonly NEW_OPTION = NEW_OPTION;

  isDarkMode = signal(false);
  isEditMode = signal(false);
  isDragOver = signal(false);
  previewImage = signal<string | null>(null);
  isSubmitting = signal(false);
  isLoadingCatalogs = signal(false);
  serverError = signal<string | null>(null);

  categories = signal<Category[]>([]);
  venues = signal<Venue[]>([]);

  private readonly eventId = signal<number | null>(null);

  @HostBinding('class.dark-theme')
  get darkTheme() {
    return this.isDarkMode();
  }

  modalities = [
    { id: 'presencial', label: 'Presencial', icon: 'groups' },
    { id: 'virtual', label: 'Virtual', icon: 'computer' },
    { id: 'hibrido', label: 'Híbrido', icon: 'settings_ethernet' },
  ] as const;

  form = this.fb.group(
    {
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120)]],
      description: ['', [Validators.required, Validators.minLength(50)]],
      requirements: [''],
      materials: [''],
      category: [null as SelectValue],
      newCategoryName: [''],
      modality: ['presencial' as 'presencial' | 'virtual' | 'hibrido', Validators.required],
      venueId: [null as SelectValue, Validators.required],
      newVenueName: [''],
      newVenueLocation: [''],
      newVenueAddress: [''],
      newVenueCapacity: [50],
      startDate: [null as Date | null, Validators.required],
      endDate: [null as Date | null, Validators.required],
      capacity: [1, [Validators.required, Validators.min(1)]],
    },
    { validators: this.dateRangeValidator }
  );

  selectedVenueId = signal<number | null>(null);

  venueCapacity = computed(() => {
    const selectedVenue = this.form.controls.venueId.value;

    if (selectedVenue === NEW_OPTION) {
      return Number(this.form.controls.newVenueCapacity.value || 0);
    }

    const venueId = this.selectedVenueId();
    if (!venueId) {
      return 0;
    }

    const venue = this.venues().find((item) => item.id === venueId);
    return venue ? venue.capacity : 0;
  });

  isOverCapacity = computed(() => {
    const currentCap = Number(this.form.controls.capacity.value || 0);
    const maxCap = this.venueCapacity();
    return maxCap > 0 && currentCap > maxCap;
  });

  constructor() {
    this.form.controls.venueId.valueChanges.subscribe((value) => {
      this.selectedVenueId.set(this.parseNumericId(value));
      this.updateDynamicValidators();
    });

    this.form.controls.category.valueChanges.subscribe(() => {
      this.updateDynamicValidators();
    });
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const parsed = Number(idParam);
      if (Number.isFinite(parsed) && parsed > 0) {
        this.isEditMode.set(true);
        this.eventId.set(parsed);
      }
    }

    this.loadInitialData();
  }

  toggleTheme(): void {
    this.isDarkMode.update((current) => !current);
  }

  isCreatingCategory(): boolean {
    return this.form.controls.category.value === NEW_OPTION;
  }

  isCreatingVenue(): boolean {
    return this.form.controls.venueId.value === NEW_OPTION;
  }

  private updateDynamicValidators(): void {
    const isNewCategory = this.isCreatingCategory();
    const isNewVenue = this.isCreatingVenue();

    const newCategoryName = this.form.controls.newCategoryName;
    const newVenueName = this.form.controls.newVenueName;
    const newVenueLocation = this.form.controls.newVenueLocation;
    const newVenueAddress = this.form.controls.newVenueAddress;
    const newVenueCapacity = this.form.controls.newVenueCapacity;

    newCategoryName.clearValidators();
    newVenueName.clearValidators();
    newVenueLocation.clearValidators();
    newVenueCapacity.clearValidators();

    if (isNewCategory) {
      newCategoryName.setValidators([Validators.required, Validators.minLength(3)]);
    } else {
      newCategoryName.setValue('', { emitEvent: false });
    }

    if (isNewVenue) {
      newVenueName.setValidators([Validators.required, Validators.minLength(3)]);
      newVenueLocation.setValidators([Validators.required, Validators.minLength(3)]);
      newVenueCapacity.setValidators([Validators.required, Validators.min(1)]);
    } else {
      newVenueName.setValue('', { emitEvent: false });
      newVenueLocation.setValue('', { emitEvent: false });
      newVenueAddress.setValue('', { emitEvent: false });
      newVenueCapacity.setValue(50, { emitEvent: false });
    }

    newCategoryName.updateValueAndValidity({ emitEvent: false });
    newVenueName.updateValueAndValidity({ emitEvent: false });
    newVenueLocation.updateValueAndValidity({ emitEvent: false });
    newVenueCapacity.updateValueAndValidity({ emitEvent: false });
  }

  loadInitialData(): void {
    this.isLoadingCatalogs.set(true);
    this.serverError.set(null);

    const eventRequest =
      this.isEditMode() && this.eventId()
        ? this.eventsService.getById(this.eventId() as number)
        : of(null);

    forkJoin({
      categories: this.categoriesService.list(),
      venues: this.venuesService.list(),
      event: eventRequest,
    })
      .pipe(finalize(() => this.isLoadingCatalogs.set(false)))
      .subscribe({
        next: ({ categories, venues, event }) => {
          this.categories.set(categories);
          this.venues.set(venues);

          if (!event && venues.length === 0) {
            this.form.controls.venueId.setValue(NEW_OPTION);
          }

          if (event) {
            this.patchFormFromEvent(event);
          }

          this.updateDynamicValidators();
        },
        error: (error: HttpErrorResponse) => {
          this.serverError.set(this.extractErrorMessage(error));
        },
      });
  }

  private patchFormFromEvent(event: EventModel): void {
    this.form.patchValue({
      title: event.title,
      description: event.description ?? '',
      requirements: event.requirements ?? '',
      materials: event.materials_url ?? '',
      category: event.category,
      modality: event.modality,
      venueId: event.venue,
      startDate: event.start_datetime ? new Date(event.start_datetime) : null,
      endDate: event.end_datetime ? new Date(event.end_datetime) : null,
      capacity: event.max_capacity,
    });

    if (event.image_url) {
      this.previewImage.set(event.image_url);
    }

    this.selectedVenueId.set(event.venue);
    this.form.markAsPristine();
  }

  dateRangeValidator(group: AbstractControl): ValidationErrors | null {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;
    if (start && end && new Date(end) <= new Date(start)) {
      return { dateRangeInvalid: true };
    }
    return null;
  }

  onSaveDraft(): void {
    this.submit('borrador');
  }

  onPublish(): void {
    this.submit('publicado');
  }

  private submit(status: EventStatus): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isOverCapacity()) {
      this.serverError.set('El cupo no puede exceder la capacidad de la sede.');
      return;
    }

    const materialsValue = (this.form.controls.materials.value ?? '').trim();
    if (materialsValue && !this.isValidHttpUrl(materialsValue)) {
      this.serverError.set('El material de apoyo debe ser una URL válida (http/https).');
      return;
    }

    this.serverError.set(null);
    this.isSubmitting.set(true);

    const currentEventId = this.eventId();

    this.ensureCatalogReferences()
      .pipe(
        switchMap(({ categoryId, venueId }) => {
          if (!venueId || venueId <= 0) {
            this.serverError.set('Selecciona una sede válida.');
            return EMPTY;
          }
          const payload = this.buildPayload(status, categoryId, venueId);
          if (this.isEditMode() && currentEventId) {
            return this.eventsService.update(currentEventId, payload);
          }
          return this.eventsService.create(payload);
        }),
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/dashboard/events']);
        },
        error: (error: HttpErrorResponse) => {
          this.serverError.set(this.extractErrorMessage(error));
        },
      });
  }

  private ensureCatalogReferences() {
    const categoryValue = this.form.controls.category.value;
    const venueValue = this.form.controls.venueId.value;

    const category$ =
      categoryValue === NEW_OPTION
        ? this.categoriesService
            .create({
              name: (this.form.controls.newCategoryName.value ?? '').trim(),
            })
            .pipe(map((category) => category.id))
        : of(this.parseNumericId(categoryValue));

    const venue$ =
      venueValue === NEW_OPTION
        ? this.venuesService
            .create({
              name: (this.form.controls.newVenueName.value ?? '').trim(),
              location: (this.form.controls.newVenueLocation.value ?? '').trim(),
              address: (this.form.controls.newVenueAddress.value ?? '').trim() || undefined,
              capacity: Number(this.form.controls.newVenueCapacity.value ?? 1),
            })
            .pipe(map((venue) => venue.id))
        : of(this.parseNumericId(venueValue) ?? 0);

    return forkJoin({ categoryId: category$, venueId: venue$ });
  }

  private buildPayload(
    status: EventStatus,
    categoryId: number | null,
    venueId: number
  ): Partial<EventModel> & { title: string; venue: number; max_capacity: number } {
    const raw = this.form.getRawValue();
    const start = this.toStartDateTime(raw.startDate);
    const end = this.toEndDateTime(raw.endDate, start);

    const payload: Partial<EventModel> & {
      title: string;
      venue: number;
      max_capacity: number;
    } = {
      title: (raw.title ?? '').trim(),
      description: (raw.description ?? '').trim(),
      requirements: (raw.requirements ?? '').trim(),
      category: categoryId,
      venue: venueId,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      max_capacity: Number(raw.capacity ?? 1),
      modality: raw.modality ?? 'presencial',
      status,
      is_public: true,
    };

    const materials = (raw.materials ?? '').trim();
    if (materials) {
      payload.materials_url = materials;
    }

    const imagePreview = this.previewImage();
    if (imagePreview && imagePreview.startsWith('http')) {
      payload.image_url = imagePreview;
    }

    return payload;
  }

  private toStartDateTime(value: Date | null): Date {
    const start = value ? new Date(value) : new Date();
    start.setHours(9, 0, 0, 0);
    return start;
  }

  private toEndDateTime(value: Date | null, start: Date): Date {
    const end = value ? new Date(value) : new Date(start);
    end.setHours(18, 0, 0, 0);

    if (end <= start) {
      end.setTime(start.getTime() + 2 * 60 * 60 * 1000);
    }

    return end;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (readEvent) => {
      this.previewImage.set(readEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  setModality(mode: 'presencial' | 'virtual' | 'hibrido'): void {
    this.form.controls.modality.setValue(mode);
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

      const preferredKeys = [
        'max_capacity',
        'venue',
        'category',
        'start_datetime',
        'end_datetime',
        'title',
        'description',
      ];

      for (const key of preferredKeys) {
        const message = this.extractFieldMessage(body[key]);
        if (message) {
          return message;
        }
      }

      const firstKey = Object.keys(body)[0];
      if (firstKey) {
        const message = this.extractFieldMessage(body[firstKey]);
        if (message) {
          return message;
        }
      }
    }

    return 'No se pudo guardar el evento. Revisa la información capturada.';
  }

  private extractFieldMessage(value: unknown): string | null {
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }

    if (typeof value === 'string' && value.trim()) {
      return value;
    }

    return null;
  }

  private parseNumericId(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim();
      if (!normalized) {
        return null;
      }
      const parsed = Number(normalized);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return null;
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
