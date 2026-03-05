import { Injectable, signal } from '@angular/core';
import { User } from '../shared/models/user';
import { UserRole } from '../shared/models/role';

const DEFAULT_ROLE: UserRole = 'student';

@Injectable({
    providedIn: 'root'
})
export class UserStateService {
    readonly user = signal<User | null>(null);
    readonly userRole = signal<UserRole>(DEFAULT_ROLE);

    constructor() { }

    setRole(role: UserRole) {
        this.userRole.set(role);
    }

    setUser(user: User | null) {
        this.user.set(user);
        this.userRole.set(user?.role ?? DEFAULT_ROLE);
    }

    clear() {
        this.user.set(null);
        this.userRole.set(DEFAULT_ROLE);
    }
}
