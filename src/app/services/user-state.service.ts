import { Injectable, signal } from '@angular/core';

export type UserRole = 'admin' | 'organizer' | 'student';

@Injectable({
    providedIn: 'root'
})
export class UserStateService {
    // Signal to hold the current role
    readonly userRole = signal<UserRole>('student');

    constructor() { }

    setRole(role: UserRole) {
        this.userRole.set(role);
    }
}
