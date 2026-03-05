import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs';
import {
  ConfirmDeleteModal,
  ConfirmDeleteModalData,
} from '../../../modals/confirm-delete-modal/confirm-delete-modal';
import { Users } from '../../../services/users';
import { UserStateService } from '../../../services/user-state.service';
import { User } from '../../../shared/models/user';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class UsersComponent implements OnInit {
  private readonly usersService = inject(Users);
  private readonly userState = inject(UserStateService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);

  isLoading = signal(true);
  serverError = signal<string | null>(null);
  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  searchTerm = signal('');
  editingUserId = signal<number | null>(null);
  savingUserId = signal<number | null>(null);
  deletingUserId = signal<number | null>(null);

  readonly currentRole = this.userState.userRole;
  readonly isAdmin = computed(() => this.currentRole() === 'admin');
  readonly isOrganizer = computed(() => this.currentRole() === 'organizer');

  readonly form = this.fb.nonNullable.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    role: ['student' as User['role'], Validators.required],
    is_active: [true],
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.serverError.set(null);

    this.usersService
      .listAll()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (users) => {
          const sorted = [...users].sort((a, b) => {
            const roleOrder = this.roleOrder(a.role) - this.roleOrder(b.role);
            if (roleOrder !== 0) {
              return roleOrder;
            }
            return `${a.first_name} ${a.last_name}`.localeCompare(
              `${b.first_name} ${b.last_name}`,
              'es',
              { sensitivity: 'base' }
            );
          });
          this.users.set(sorted);
          this.applyFilter(this.searchTerm());
        },
        error: (error) => {
          this.users.set([]);
          this.filteredUsers.set([]);
          this.serverError.set(
            this.extractErrorMessage(error, 'No se pudo cargar la lista de usuarios.')
          );
        },
      });
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
    this.applyFilter(input.value);
  }

  beginEdit(user: User): void {
    if (!this.canManageUser(user)) {
      return;
    }
    this.serverError.set(null);
    this.editingUserId.set(user.id);
    this.form.reset({
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      role: user.role,
      is_active: !!user.is_active,
    });
  }

  cancelEdit(): void {
    this.editingUserId.set(null);
    this.savingUserId.set(null);
  }

  saveEdit(user: User): void {
    if (!this.canManageUser(user) || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();
    this.savingUserId.set(user.id);
    this.serverError.set(null);

    this.usersService
      .update(user.id, payload)
      .pipe(finalize(() => this.savingUserId.set(null)))
      .subscribe({
        next: (updated) => {
          this.users.update((current) =>
            current.map((item) => (item.id === updated.id ? updated : item))
          );
          this.applyFilter(this.searchTerm());
          this.editingUserId.set(null);
        },
        error: (error) => {
          this.serverError.set(
            this.extractErrorMessage(error, 'No se pudo actualizar el usuario.')
          );
        },
      });
  }

  deleteUser(user: User): void {
    if (!this.canManageUser(user)) {
      return;
    }

    const dialogData: ConfirmDeleteModalData = {
      title: 'Eliminar usuario',
      message: `¿Seguro que deseas eliminar a ${this.displayName(user)}?`,
      confirmLabel: 'Sí, eliminar',
      cancelLabel: 'Cancelar',
    };

    const ref = this.dialog.open(ConfirmDeleteModal, {
      width: '420px',
      data: dialogData,
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.deletingUserId.set(user.id);
      this.serverError.set(null);
      this.usersService
        .delete(user.id)
        .pipe(finalize(() => this.deletingUserId.set(null)))
        .subscribe({
          next: () => {
            this.users.update((current) => current.filter((item) => item.id !== user.id));
            this.applyFilter(this.searchTerm());
            if (this.editingUserId() === user.id) {
              this.editingUserId.set(null);
            }
          },
          error: (error) => {
            this.serverError.set(
              this.extractErrorMessage(error, 'No se pudo eliminar el usuario.')
            );
          },
        });
    });
  }

  canManageUser(user: User): boolean {
    return this.isAdmin() && user.role !== 'admin';
  }

  displayRole(role: User['role']): string {
    if (role === 'admin') {
      return 'Administrador';
    }
    if (role === 'organizer') {
      return 'Organizador';
    }
    return 'Estudiante';
  }

  displayName(user: User): string {
    const fullName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
    return fullName || user.username || user.email;
  }

  private applyFilter(searchValue: string): void {
    const query = searchValue.trim().toLowerCase();
    if (!query) {
      this.filteredUsers.set(this.users());
      return;
    }

    this.filteredUsers.set(
      this.users().filter((user) => {
        const candidate = [
          user.username,
          user.email,
          user.first_name,
          user.last_name,
          this.displayRole(user.role),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return candidate.includes(query);
      })
    );
  }

  private roleOrder(role: User['role']): number {
    if (role === 'admin') {
      return 0;
    }
    if (role === 'organizer') {
      return 1;
    }
    return 2;
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) {
      return fallback;
    }
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error.trim();
    }
    if (error.error && typeof error.error === 'object') {
      const detail = (error.error as { detail?: unknown }).detail;
      if (typeof detail === 'string' && detail.trim()) {
        return detail.trim();
      }

      for (const value of Object.values(error.error as Record<string, unknown>)) {
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
        if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
          return value[0].trim();
        }
      }
    }
    return fallback;
  }
}
