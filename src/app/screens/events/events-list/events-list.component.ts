import { Component, OnInit, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

// Partials
import { EventCardGlassComponent } from '../../../partials/event-card-glass/event-card-glass.component';
import { EventTableGlassComponent } from '../../../partials/event-table-glass/event-table-glass.component';
import { FilterBarGlassComponent } from '../../../partials/filter-bar-glass/filter-bar-glass.component';
import { UserStateService } from '../../../services/user-state.service';

@Component({
    selector: 'app-events-list',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        EventCardGlassComponent,
        EventTableGlassComponent,
        FilterBarGlassComponent
    ],
    templateUrl: './events-list.component.html',
    styleUrl: './events-list.component.scss'
})
export class EventsListComponent implements OnInit {
    private userState = inject(UserStateService);

    // Logic: Signals for State Management
    // Now derived from the shared service
    userRole = this.userState.userRole;

    isLoading = signal<boolean>(true);
    events = signal<any[]>([]);
    filteredEvents = signal<any[]>([]);

    constructor() {
        // Effect to log role changes or handle side effects
        effect(() => {
            console.log(`Current Role View: ${this.userRole()}`);
        });
    }

    ngOnInit() {
        this.loadEvents();
    }

    // Simulator for data loading
    loadEvents() {
        this.isLoading.set(true);
        setTimeout(() => {
            const mockEvents = [
                {
                    id: 1,
                    title: 'IA Generativa para Principiantes',
                    date: new Date('2024-03-15'),
                    time: '10:00 AM',
                    organizer: 'Tech University',
                    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800',
                    capacity: 100,
                    attendees: 85,
                    capacityPercentage: 85,
                    status: 'Publicado',
                    description: 'Aprende los fundamentos de la IA generativa y sus aplicaciones.'
                },
                {
                    id: 2,
                    title: 'UX/UI Design Workshop: Glassmorphism',
                    date: new Date('2024-03-20'),
                    time: '2:00 PM',
                    organizer: 'Design Lab',
                    image: 'https://images.unsplash.com/photo-1558655146-d09347e0b7a9?auto=format&fit=crop&q=80&w=800',
                    capacity: 50,
                    attendees: 20,
                    capacityPercentage: 40,
                    status: 'Borrador',
                    description: 'Taller práctico sobre tendencias de diseño moderno.'
                },
                {
                    id: 3,
                    title: 'Hackathon: Green Tech Solutions',
                    date: new Date('2024-04-05'),
                    time: '9:00 AM',
                    organizer: 'Eco Innovators',
                    image: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800',
                    capacity: 200,
                    attendees: 195,
                    capacityPercentage: 97,
                    status: 'Publicado',
                    description: 'Desarrolla soluciones tecnológicas para el medio ambiente.'
                },
                {
                    id: 4,
                    title: 'Marketing Digital Strategy 2024',
                    date: new Date('2024-03-25'),
                    time: '3:30 PM',
                    organizer: 'Business Hub',
                    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800',
                    capacity: 150,
                    attendees: 45,
                    capacityPercentage: 30,
                    status: 'Cancelado',
                    description: 'Estrategias clave para el crecimiento de marca.'
                }
            ];

            this.events.set(mockEvents);
            this.filteredEvents.set(mockEvents); // Initial state
            this.isLoading.set(false);
        }, 2000); // 2s fake delay to show skeleton
    }

    onFilterChange(query: string) {
        if (!query) {
            this.filteredEvents.set(this.events());
            return;
        }
        const lowerQuery = query.toLowerCase();
        const filtered = this.events().filter(e =>
            e.title.toLowerCase().includes(lowerQuery) ||
            e.organizer.toLowerCase().includes(lowerQuery)
        );
        this.filteredEvents.set(filtered);
    }
}
