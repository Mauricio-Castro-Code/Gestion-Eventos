import { Component, computed, signal, model } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';

export interface Enrollment {
    id: number;
    title: string;
    date: Date;
    venue: string;
    status: 'confirmed' | 'attended' | 'missed' | 'cancelled';
    folderUrl?: string;
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
        FormsModule
    ],
    templateUrl: './my-enrollments.component.html',
    styleUrls: ['./my-enrollments.component.scss']
})
export class MyEnrollmentsComponent {
    // Signals
    currentTab = signal<'upcoming' | 'history'>('upcoming');
    showModal = signal(false);
    selectedEnrollmentId = signal<number | null>(null);
    cancellationReason = signal('');

    // Mock Data
    enrollments = signal<Enrollment[]>([
        {
            id: 1,
            title: 'Workshop: Angular 20 Signals',
            date: new Date('2026-02-15T10:00:00'),
            venue: 'Auditorio Principal',
            status: 'confirmed'
        },
        {
            id: 2,
            title: 'Seminario: UX Avanzado',
            date: new Date('2026-02-28T14:30:00'),
            venue: 'Sala Virtual A',
            status: 'confirmed'
        },
        {
            id: 3,
            title: 'Hackathon 2025',
            date: new Date('2025-11-20T09:00:00'),
            venue: 'Campus Central',
            status: 'attended'
        },
        {
            id: 4,
            title: 'Intro a Data Science',
            date: new Date('2025-10-15T16:00:00'),
            venue: 'Lab 3',
            status: 'missed'
        },
        {
            id: 5,
            title: 'Gestión de Proyectos Ágiles',
            date: new Date('2026-03-10T11:00:00'),
            venue: 'Sala de Conferencias B',
            status: 'confirmed'
        }
    ]);

    // Computed Logic
    filteredEnrollments = computed(() => {
        const tab = this.currentTab();
        const now = new Date();

        return this.enrollments().filter(e => {
            if (e.status === 'cancelled') return false; // Don't show cancelled for now? Or maybe in history?

            if (tab === 'upcoming') {
                return e.date >= now && e.status === 'confirmed';
            } else {
                return e.date < now || e.status !== 'confirmed';
            }
        }).sort((a, b) => {
            return tab === 'upcoming'
                ? a.date.getTime() - b.date.getTime()
                : b.date.getTime() - a.date.getTime();
        });
    });

    stats = computed(() => {
        const all = this.enrollments();
        const active = all.filter(e => e.status === 'confirmed' && e.date >= new Date()).length;
        const attended = all.filter(e => e.status === 'attended').length;
        return { active, attended };
    });

    // Actions
    switchTab(tab: 'upcoming' | 'history') {
        this.currentTab.set(tab);
    }

    initiateCancellation(id: number) {
        this.selectedEnrollmentId.set(id);
        this.cancellationReason.set('');
        this.showModal.set(true);
    }

    cancelModal() {
        this.showModal.set(false);
        this.selectedEnrollmentId.set(null);
    }

    confirmCancellation() {
        const id = this.selectedEnrollmentId();
        if (id) {
            this.enrollments.update(prev =>
                prev.map(e => e.id === id ? { ...e, status: 'cancelled' } : e)
            );
        }
        this.cancelModal();
    }
}
