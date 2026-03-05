import { Component, computed, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UserStateService } from '../../services/user-state.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent {
  private readonly userState = inject(UserStateService);
  // Outputs
  toggleSidebar = output<void>();
  readonly user = this.userState.user;

  readonly userInitials = computed(() => {
    const user = this.user();
    if (!user) {
      return 'US';
    }

    const first = (user.first_name || '').trim();
    const last = (user.last_name || '').trim();
    const username = (user.username || '').trim();
    const email = (user.email || '').trim();

    if (first || last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }
    if (username) {
      return username.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'US';
  });

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }
}
