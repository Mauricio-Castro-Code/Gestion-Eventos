import { Component, computed, OnInit, signal, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { SidebarComponent } from '../../partials/sidebar/sidebar';
import { NavbarComponent } from '../../partials/navbar/navbar';
import { EventTableGlassComponent } from '../../partials/event-table-glass/event-table-glass.component';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UserStateService, UserRole } from '../../services/user-state.service';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

interface User {
    id: number;
    name: string;
    role: string;
    status: 'Active' | 'Pending';
}

interface EventItem {
    id: number;
    title: string;
    date: string;
    time: string;
    location: string;
    status: 'Confirmed' | 'Pending';
}

interface HistoryItem {
    event: string;
    date: string;
    attendance: 'Asistió' | 'No Asistió';
}

interface AdminEventItem {
    id: number;
    title: string;
    organizer: string;
    date: string;
    location: string;
    category: string;
    status: 'Published' | 'Draft' | 'Cancelled';
    attendees: number;
    capacity: number;
    capacityPercentage: number;
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        MatSidenavModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatPaginatorModule,
        MatChipsModule,
        MatCardModule,
        BaseChartDirective,
        SidebarComponent,
        NavbarComponent,
        EventTableGlassComponent
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
    private router = inject(Router);
    private userState = inject(UserStateService);
    private breakpointObserver = inject(BreakpointObserver);

    @ViewChild('sidenav') sidenav!: MatSidenav;

    // Signals
    // userRole is now derived from the service
    userRole = this.userState.userRole;

    isLoading = signal(true);
    sidebarOpen = signal(true);
    sidebarMode = signal<'over' | 'push' | 'side'>('side');
    showBackdrop = signal(false);
    showToast = signal(false);

    // Determine if we should show the dashboard home content
    showDashboardContent = signal(true);

    constructor() {
        // Monitor route changes to toggle dashboard content & close sidebar on mobile
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe(() => {
            this.checkRoute();
            if (this.sidebarMode() === 'over') {
                this.sidebarOpen.set(false);
            }
        });

        // Responsive Sidebar Logic
        inject(BreakpointObserver).observe([Breakpoints.Handset, Breakpoints.Tablet]).subscribe(result => {
            if (result.matches) {
                this.sidebarMode.set('over');
                this.sidebarOpen.set(false); // Close by default on mobile
                this.showBackdrop.set(true);
            } else {
                this.sidebarMode.set('side');
                this.sidebarOpen.set(true); // Open by default on desktop
                this.showBackdrop.set(false);
            }
        });
    }

    checkRoute() {
        const url = this.router.url;
        // Show content ONLY if we are exactly on /dashboard and not a child route
        this.showDashboardContent.set(url === '/dashboard');
    }

    // Computed
    occupancyRate = computed(() => {
        // Mock calculation
        return 78;
    });

    // Mock Data
    allEvents: AdminEventItem[] = [
        { id: 1, title: 'Intro to Angular 20', organizer: 'Bob Smith', date: 'Jan 20, 2026', location: 'Room 304', category: 'Tech', status: 'Published', attendees: 45, capacity: 50, capacityPercentage: 90 },
        { id: 2, title: 'Advanced Signals', organizer: 'Bob Smith', date: 'Jan 22, 2026', location: 'Lab 1', category: 'Tech', status: 'Draft', attendees: 10, capacity: 30, capacityPercentage: 33 },
        { id: 3, title: 'UX Principles', organizer: 'Alice Design', date: 'Feb 10, 2026', location: 'Auditorium A', category: 'Design', status: 'Published', attendees: 120, capacity: 200, capacityPercentage: 60 },
        { id: 4, title: 'Business 101', organizer: 'John Doe', date: 'Feb 15, 2026', location: 'Online', category: 'Business', status: 'Cancelled', attendees: 0, capacity: 100, capacityPercentage: 0 },
        { id: 5, title: 'Creative Writing', organizer: 'Sarah Lee', date: 'Mar 05, 2026', location: 'Room 202', category: 'Art', status: 'Published', attendees: 25, capacity: 25, capacityPercentage: 100 },
    ];

    agendaItems: EventItem[] = [
        {
            id: 1,
            title: 'Intro to Angular 20',
            date: 'Jan 20, 2026',
            time: '10:00 AM',
            location: 'Room 304',
            status: 'Confirmed',
        },
        {
            id: 2,
            title: 'Advanced Signals',
            date: 'Jan 22, 2026',
            time: '02:00 PM',
            location: 'Lab 1',
            status: 'Pending',
        }
    ];

    historyItems: HistoryItem[] = [
        { event: 'Web Design Basics', date: 'Dec 15, 2025', attendance: 'Asistió' },
        { event: 'UX Principles', date: 'Dec 10, 2025', attendance: 'No Asistió' },
        { event: 'Typescript Deep Dive', date: 'Nov 20, 2025', attendance: 'Asistió' },
    ];

    displayedColumnsStudent: string[] = ['event', 'date', 'attendance'];

    // Organizer Stats
    nextEvent = {
        title: 'Hackathon 2026',
        date: new Date('2026-02-15T09:00:00'),
    };
    countdown = signal('');

    // Charts Logic
    public barChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#1A237E' } },
        },
        scales: {
            x: { ticks: { color: '#64748B' }, grid: { color: 'rgba(0,0,0,0.05)' } },
            y: { ticks: { color: '#64748B' }, grid: { color: 'rgba(0,0,0,0.05)' } },
        },
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    };
    public barChartType: ChartType = 'bar';
    public barChartData: ChartData<'bar'> = {
        labels: ['Tech', 'Design', 'Business', 'Art', 'Science'],
        datasets: [
            {
                data: [65, 59, 80, 81, 56],
                label: 'Events per Category',
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)',
                ],
                borderColor: '#fff',
                borderWidth: 1,
            },
        ],
    };

    public doughnutChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#1A237E' } },
        },
    };
    public doughnutChartType: ChartType = 'doughnut';
    public doughnutChartData: ChartData<'doughnut'> = {
        labels: ['Auditorium A', 'Lab 1', 'Conference Room', 'Online'],
        datasets: [
            {
                data: [30, 20, 15, 35],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)'
                ],
                borderColor: '#ffffff',
                borderWidth: 2,
            },
        ],
    };

    // Organizer Line Chart
    public lineChartOptions: ChartConfiguration['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        elements: {
            line: { tension: 0.4 },
        },
        scales: {
            x: { ticks: { color: '#64748B' }, grid: { color: 'rgba(0,0,0,0.05)' } },
            y: { ticks: { color: '#64748B' }, grid: { color: 'rgba(0,0,0,0.05)' } },
        },
        plugins: { legend: { labels: { color: '#1A237E' } } },
    };
    public lineChartType: ChartType = 'line';
    public lineChartData: ChartData<'line'> = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                data: [28, 48, 40, 79, 86, 90],
                label: 'Enrollment Trends',
                backgroundColor: 'rgba(63, 81, 181, 0.3)',
                borderColor: '#7986cb',
                pointBackgroundColor: '#fff',
                pointBorderColor: '#fff',
                fill: true,
            },
        ],
    };

    ngOnInit() {
        this.checkRoute();
        // Simulate Data Loading
        setTimeout(() => {
            this.isLoading.set(false);
            this.triggerToast();
            this.startTimer();
        }, 2000);
    }

    toggleSidebar() {
        this.sidebarOpen.update((v) => !v);
    }

    // Demo: Switch roles for testing
    switchRole(role: UserRole) {
        this.isLoading.set(true);
        this.userState.setRole(role);

        // Reset charts or other state if necessary

        setTimeout(() => {
            this.isLoading.set(false);
            this.triggerToast(`Switched to ${role} view`);
        }, 800);
    }

    triggerToast(message: string = 'Welcome back!') {
        this.showToast.set(true);
        // In a real app, bind the message to a signal too.
        setTimeout(() => this.showToast.set(false), 3000);
    }

    // Organizer Countdown
    startTimer() {
        setInterval(() => {
            const now = new Date().getTime();
            const distance = this.nextEvent.date.getTime() - now;
            if (distance < 0) {
                this.countdown.set('Event Started');
                return;
            }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            this.countdown.set(`${days}d ${hours}h ${minutes}m`);
        }, 1000);
    }

    cancelBooking(id: number) {
        this.triggerToast('Booking cancelled');
    }
}
