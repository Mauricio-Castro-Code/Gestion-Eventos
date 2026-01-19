import { Component, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';

// Custom Validator for Domain
export function domainValidator(domain: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        const email = control.value as string;
        if (!email) return null;
        return email.endsWith(domain) ? null : { invalidDomain: { required: domain } };
    };
}

// Custom Validator for Password Match
export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password');
    const confirm = control.get('confirmPassword');

    if (!password || !confirm) return null;

    return password.value === confirm.value ? null : { passwordMismatch: true };
};

type UserRole = 'student' | 'organizer' | 'admin';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterLink,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatButtonToggleModule,
        MatSelectModule
    ],
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
    private fb = inject(FormBuilder);

    // Signals
    selectedRole = signal<UserRole>('student');
    hidePassword = signal(true);
    hideConfirmPassword = signal(true);
    passwordStrength = signal(0);

    // Computed Signal for Strength Color
    strengthColor = computed(() => {
        const strength = this.passwordStrength();
        if (strength < 30) return '#FF5252'; // Red
        if (strength < 70) return '#FFA726'; // Orange
        return '#66BB6A'; // Green
    });

    registerForm = this.fb.group({
        firstName: ['', [Validators.required]],
        lastName: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email, domainValidator('@alumno.buap.mx')]],

        // Role specific fields (Initially optional)
        workerId: [''],
        adminKey: [''],

        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
        terms: [false, [Validators.requiredTrue]]
    }, { validators: passwordMatchValidator });

    constructor() {
        // React to role changes to update validators
        effect(() => {
            const role = this.selectedRole();
            this.updateValidators(role);
        });
    }

    onRoleChange(value: UserRole) {
        this.selectedRole.set(value);
    }

    private updateValidators(role: UserRole) {
        const workerIdControl = this.registerForm.get('workerId');
        const adminKeyControl = this.registerForm.get('adminKey');

        // Reset validators
        workerIdControl?.clearValidators();
        adminKeyControl?.clearValidators();

        // Reset values to avoid submission of hidden data
        if (role !== 'organizer') workerIdControl?.setValue('');
        if (role !== 'admin') adminKeyControl?.setValue('');

        // Apply new validators based on role
        if (role === 'organizer') {
            workerIdControl?.setValidators([Validators.required]);
        } else if (role === 'admin') {
            adminKeyControl?.setValidators([Validators.required]);
        }

        workerIdControl?.updateValueAndValidity();
        adminKeyControl?.updateValueAndValidity();
    }

    togglePassword(event: MouseEvent) {
        event.stopPropagation();
        this.hidePassword.update(value => !value);
    }

    toggleConfirmPassword(event: MouseEvent) {
        event.stopPropagation();
        this.hideConfirmPassword.update(value => !value);
    }

    updatePasswordStrength(value: string) {
        let score = 0;
        if (!value) {
            this.passwordStrength.set(0);
            return;
        }

        if (value.length >= 8) score += 20;
        if (/[A-Z]/.test(value)) score += 20;
        if (/[a-z]/.test(value)) score += 20;
        if (/[0-9]/.test(value)) score += 20;
        if (/[^A-Za-z0-9]/.test(value)) score += 20;

        this.passwordStrength.set(score);
    }

    onSubmit() {
        if (this.registerForm.valid) {
            const formData = { ...this.registerForm.value, role: this.selectedRole() };
            console.log('Form Submitted', formData);
            // Integrate with backend auth service here
        } else {
            this.registerForm.markAllAsTouched();
        }
    }

    // Getters for nicer template access
    get f() { return this.registerForm.controls; }
}
