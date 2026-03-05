import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../services/auth';

interface MenuItem {
  label: string;
  icon: string;
  link?: string;
}

interface ActiveEventItem {
  id: number;
  title: string;
  status: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class SidebarComponent {
  constructor(
    private readonly auth: Auth,
    private readonly router: Router
  ) {}

  // Inputs
  userRole = input.required<'admin' | 'organizer' | 'student'>();
  activeEvents = input<ActiveEventItem[]>([]);

  // Computed Navigation Items
  navItems = computed<MenuItem[]>(() => {
    const role = this.userRole();

    let roleItems: MenuItem[] = [];

    switch (role) {
      case 'admin':
      case 'organizer':
        roleItems = [
          { label: 'Users', icon: 'groups', link: '/dashboard/users' },
        ];
        break;
      case 'student':
        roleItems = [
          { label: 'My Enrollments', icon: 'class', link: '/dashboard/my-enrollments' },
        ];
        break;
    }

    return [
      { label: 'Dashboard', icon: 'dashboard', link: '/dashboard' },
      ...roleItems,
      ...(role === 'admin'
        ? []
        : [{ label: 'Events Catalog', icon: 'manage_search', link: '/catalog' }]),
      { label: 'Profile', icon: 'person', link: '/dashboard/profile' },
    ];
  });

  eventLink(eventId: number): string | any[] {
    if (this.userRole() === 'student') {
      return '/catalog';
    }
    return ['/events', eventId];
  }

  onLogout(): void {
    this.auth.logout();
    void this.router.navigate(['/']);
  }
}
