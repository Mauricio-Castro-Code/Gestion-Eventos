
import { Component, computed, effect, inject, signal, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Angular Material Imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, provideNativeDateAdapter } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatTooltipModule
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './event-form.html',
  styleUrl: './event-form.scss',
})
export class EventForm {
  private fb = inject(FormBuilder);

  // Theme Toggler
  isDarkMode = signal(false);

  @HostBinding('class.dark-theme') get darkTheme() {
    return this.isDarkMode();
  }

  toggleTheme() {
    this.isDarkMode.update(curr => !curr);
  }

  // Mock Data for Dropdowns
  venues = [
    { id: '1', name: 'Auditorio Principal', capacity: 200 },
    { id: '2', name: 'Sala de Conferencias A', capacity: 50 },
    { id: '3', name: 'Sala de Conferencias B', capacity: 30 },
    { id: '4', name: 'Patio Central', capacity: 500 },
  ];

  categories = ['Académico', 'Cultural', 'Deportivo', 'Social', 'Taller'];

  modalities = [
    { id: 'presencial', label: 'Presencial', icon: 'groups' },
    { id: 'virtual', label: 'Virtual', icon: 'computer' },
    { id: 'hibrido', label: 'Híbrido', icon: 'settings_ethernet' }
  ];

  // State Signals
  isEditMode = signal(false);
  isDragOver = signal(false);
  previewImage = signal<string | null>(null);

  // Form Definition
  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.minLength(50)]],
    requirements: [''],
    materials: [''],
    category: ['', Validators.required],
    modality: ['presencial', Validators.required],
    venueId: ['', Validators.required],
    startDate: [null as Date | null, Validators.required],
    endDate: [null as Date | null, Validators.required],
    capacity: [0, [Validators.required, Validators.min(1)]]
  }, { validators: this.dateRangeValidator });

  // Computed Signals
  selectedVenueId = signal<string>(''); // driven by form changes

  venueCapacity = computed(() => {
    const venue = this.venues.find(v => v.id === this.selectedVenueId());
    return venue ? venue.capacity : 0;
  });

  // Capacity Warning Logic
  isOverCapacity = computed(() => {
    const currentCap = this.form.controls.capacity.value || 0;
    const maxCap = this.venueCapacity();
    return maxCap > 0 && currentCap > maxCap;
  });

  constructor() {
    // Sync form venue changes to signal
    this.form.controls.venueId.valueChanges.subscribe(val => {
      this.selectedVenueId.set(val || '');
    });
  }

  // Custom Validator for Dates
  dateRangeValidator(group: AbstractControl): ValidationErrors | null {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;
    if (start && end && new Date(end) <= new Date(start)) {
      return { dateRangeInvalid: true };
    }
    return null;
  }

  // Drag & Drop Handlers
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File) {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewImage.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  // Modality Selection via Chips
  setModality(mode: string) {
    this.form.controls.modality.setValue(mode);
  }
}
