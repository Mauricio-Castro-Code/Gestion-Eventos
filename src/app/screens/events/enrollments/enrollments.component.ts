import { Component, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EnrollmentCancelModal } from '../../../modals/enrollment-cancel-modal/enrollment-cancel-modal';

interface Student {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
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
    private dialog = inject(MatDialog);

    // Mock Data
    students = signal<Student[]>([
        { id: '1', name: 'Sofia Williams', email: 'sofia.w@example.com', enrolledAt: new Date(), status: 'confirmed', attended: true },
        { id: '2', name: 'Isabella Johnson', email: 'doc.isa@med.co', enrolledAt: new Date(Date.now() - 86400000), status: 'confirmed', attended: false },
        { id: '3', name: 'Alfonso Rodríguez', email: 'alfonso@tech.mx', enrolledAt: new Date(), status: 'confirmed', attended: false },
        { id: '4', name: 'Maria Garcia', email: 'maria.g@design.org', enrolledAt: new Date(), status: 'confirmed', attended: false },
        { id: '5', name: 'John Smith', email: 'john.smith@corp.com', enrolledAt: new Date(), status: 'pending', attended: false },
        { id: '6', name: 'Emma Brown', email: 'emma.b@agency.net', enrolledAt: new Date(), status: 'confirmed', attended: true },
    ]);

    // KPIs
    totalInscritos = computed(() => this.students().filter(s => s.status !== 'cancelled').length);
    cupo = signal(50);
    totalAsistieron = computed(() => this.students().filter(s => s.attended && s.status !== 'cancelled').length);

    pulseState = signal(false);

    toggleAttendance(id: string, current: boolean) {
        const newVal = !current;

        // Optimistic Update
        this.students.update(list => list.map(s =>
            s.id === id ? { ...s, attended: newVal } : s
        ));

        // Trigger Pulse Effect logic for specific KPI
        if (newVal) {
            this.triggerPulse();
        }

        // In real app: this.service.updateAttendance(id, newVal).subscribe(...)
    }

    triggerPulse() {
        // Logic handled via class binding in HTML or DOM manipulation for animation restart
        // Let's use a temporary true state
        const el = document.querySelector('.metric.asistieron');
        if (el) {
            el.classList.remove('pulse');
            void (el as HTMLElement).offsetWidth; // force reflow
            el.classList.add('pulse');
        }
    }

    openCancelModal(student: Student) {
        const dialogRef = this.dialog.open(EnrollmentCancelModal, {
            data: { student },
            width: '450px',
            // panelClass can be global or handled by internal styles of the component if viewEncapsulation is None, 
            // but simpler to use default material panel and style content
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result && result.confirmed) {
                this.students.update(list => list.map(s =>
                    s.id === student.id ? { ...s, status: 'cancelled' } : s
                ));
            }
        });
    }

    getStatusLabel(status: string) {
        switch (status) {
            case 'confirmed': return 'Confirmado';
            case 'pending': return 'Pendiente';
            case 'cancelled': return 'Cancelado';
            default: return status;
        }
    }
}
