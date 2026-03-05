import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Events } from '../../services/events';
import { Event } from '../../shared/models/event';

interface LandingEvent {
    id: number;
    title: string;
    date: string;
    status: string;
    image: string;
}

interface Faq {
    question: string;
    answer: string;
    isOpen: boolean;
}

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, RouterLink, MatIconModule],
    templateUrl: './landing.component.html',
    styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit {
    private readonly eventsService = inject(Events);

    isLoadingEvents = signal<boolean>(true);

    upcomingEvents = signal<LandingEvent[]>([]);

    faqs = signal<Faq[]>([
        {
            question: '¿Cómo recupero mi contraseña?',
            answer: 'Puedes restablecer tu contraseña haciendo clic en "Olvidé mi contraseña" en la pantalla de inicio de sesión. Recibirás un correo con las instrucciones.',
            isOpen: false
        },
        {
            question: '¿Tienen costo los eventos?',
            answer: 'La mayoría de los eventos académicos son gratuitos para estudiantes. Algunos talleres especializados podrían tener una cuota de recuperación.',
            isOpen: false
        },
        {
            question: '¿Cuándo recibo mi constancia?',
            answer: 'Las constancias se generan automáticamente 24-48 horas después de validar tu asistencia al evento y completar la encuesta de satisfacción.',
            isOpen: false
        }
    ]);

    ngOnInit(): void {
        this.loadUpcomingEvents();
    }

    toggleFaq(index: number) {
        this.faqs.update(faqs => {
            const newFaqs = [...faqs];
            newFaqs[index].isOpen = !newFaqs[index].isOpen;
            return newFaqs;
        });
    }

    private loadUpcomingEvents(): void {
        this.isLoadingEvents.set(true);

        this.eventsService.listAll().subscribe({
            next: (events) => {
                const now = new Date();
                const mapped = events
                    .filter((event) => event.status === 'publicado')
                    .filter((event) => new Date(event.start_datetime) > now)
                    .sort(
                        (a, b) =>
                            new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
                    )
                    .slice(0, 6)
                    .map((event) => this.toLandingEvent(event));

                this.upcomingEvents.set(mapped);
                this.isLoadingEvents.set(false);
            },
            error: () => {
                this.upcomingEvents.set([]);
                this.isLoadingEvents.set(false);
            },
        });
    }

    private toLandingEvent(event: Event): LandingEvent {
        const attendees = event.attendees ?? event.enrolled_count ?? 0;
        const capacity = event.capacity ?? event.max_capacity;
        const remaining = Math.max(capacity - attendees, 0);
        const status =
            remaining <= 0
                ? 'Sin cupo'
                : remaining <= 5
                    ? 'Últimos Lugares'
                    : 'Cupo Disponible';

        const date = new Date(event.start_datetime).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });

        return {
            id: event.id,
            title: event.title,
            date,
            status,
            image:
                event.image_url ||
                'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=500',
        };
    }
}
