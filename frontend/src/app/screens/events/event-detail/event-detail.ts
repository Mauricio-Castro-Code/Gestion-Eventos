import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Events } from '../../../services/events';
import { Event } from '../../../shared/models/event';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.scss',
})
export class EventDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly eventsService = inject(Events);

  isLoading = signal<boolean>(true);
  serverError = signal<string | null>(null);
  event = signal<Event | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const eventId = Number(idParam);

    if (!Number.isFinite(eventId) || eventId <= 0) {
      this.serverError.set('El evento solicitado no es válido.');
      this.isLoading.set(false);
      return;
    }

    this.loadEvent(eventId);
  }

  private loadEvent(eventId: number): void {
    this.isLoading.set(true);
    this.serverError.set(null);

    this.eventsService.getById(eventId).subscribe({
      next: (event) => {
        this.event.set(event);
        this.isLoading.set(false);
      },
      error: () => {
        this.serverError.set('No se pudo cargar la información del evento.');
        this.isLoading.set(false);
      },
    });
  }
}
