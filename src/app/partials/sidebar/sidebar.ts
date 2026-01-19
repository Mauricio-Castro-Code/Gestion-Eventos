import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';

interface MenuItem {
  label: string;
  icon: string;
  link?: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class SidebarComponent {
  // Inputs
  userRole = input.required<'admin' | 'organizer' | 'student'>();

  // Outputs
  roleSwitched = output<'admin' | 'organizer' | 'student'>();

  // Computed Navigation Items
  navItems = computed<MenuItem[]>(() => {
    const role = this.userRole();

    let roleItems: MenuItem[] = [];

    switch (role) {
      case 'admin':
        roleItems = [
          { label: 'Users', icon: 'people_outline' },
          { label: 'Categories', icon: 'category' },
          { label: 'Venues', icon: 'meeting_room' },
          { label: 'Global Reports', icon: 'analytics' },
          { label: 'All Events', icon: 'event_note', link: '/dashboard/events' }
        ];
        break;
      case 'organizer':
        roleItems = [
          { label: 'My Events', icon: 'event_available', link: '/dashboard/events' },
          { label: 'Create Event', icon: 'add_circle_outline' },
          { label: 'Reports', icon: 'insights' },
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
      { label: 'Events Catalog', icon: 'manage_search', link: '/dashboard/events' },
      { label: 'Profile', icon: 'person' },
    ];
  });

  onSwitchRole(role: 'admin' | 'organizer' | 'student') {
    this.roleSwitched.emit(role);
  }
}
