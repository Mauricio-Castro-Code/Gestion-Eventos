import { Component, input, output, ViewChild, AfterViewInit, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';

@Component({
    selector: 'app-event-table-glass',
    standalone: true,
    imports: [
        CommonModule,
        DatePipe,
        MatMenuModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatSortModule,
        MatPaginatorModule,
        MatInputModule
    ],
    templateUrl: './event-table-glass.component.html',
    styleUrl: './event-table-glass.component.scss'
})
export class EventTableGlassComponent implements AfterViewInit {
    events = input.required<any[]>();
    title = input<string>('Mis Eventos');
    canManage = input<boolean>(true);
    showCreateButton = input<boolean>(true);

    createRequested = output<void>();
    editRequested = output<any>();
    deleteRequested = output<any>();

    dataSource = new MatTableDataSource<any>([]);
    displayedColumns: string[] = ['status', 'title', 'occupancy', 'actions'];

    @ViewChild(MatSort) sort!: MatSort;
    @ViewChild(MatPaginator) paginator!: MatPaginator;

    constructor() {
        // Update dataSource whenever events input changes
        effect(() => {
            this.dataSource.data = this.events();
            // Re-assign paginator/sort if they were already initialized
            if (this.paginator) this.dataSource.paginator = this.paginator;
            if (this.sort) this.dataSource.sort = this.sort;
        });
    }

    ngAfterViewInit() {
        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
    }

    router = inject(Router);

    onManageEnrollments(id: any) {
        this.router.navigate(['/dashboard/events', id, 'enrollments']);
    }

    onView(eventId: number) {
        this.router.navigate(['/events', eventId]);
    }

    onCreate() {
        this.createRequested.emit();
    }

    onEdit(event: any) {
        this.editRequested.emit(event);
    }

    onDelete(event: any) {
        this.deleteRequested.emit(event);
    }

    getStatusClass(status: string): string {
        switch (status.toLowerCase()) {
            case 'publicado': return 'status-published';
            case 'borrador': return 'status-draft';
            case 'cancelado': return 'status-cancelled';
            default: return '';
        }
    }
}
