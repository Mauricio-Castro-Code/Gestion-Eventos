import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatInputModule,
        MatFormFieldModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        RouterLink
    ],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent {
    loginForm: FormGroup;
    hidePassword = signal(true);

    constructor(private fb: FormBuilder) {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(8)]]
        });
    }

    togglePassword(event: Event) {
        event.preventDefault();
        this.hidePassword.update(value => !value);
    }

    onSubmit() {
        if (this.loginForm.valid) {
            console.log('Login Form Submitted:', this.loginForm.value);
        } else {
            this.loginForm.markAllAsTouched();
        }
    }

    getErrorMessage(controlName: string): string {
        const control = this.loginForm.get(controlName);
        if (control?.hasError('required')) {
            return 'Campo requerido';
        }
        if (control?.hasError('email')) {
            return 'Correo inválido';
        }
        if (control?.hasError('minlength')) {
            return 'Mínimo 8 caracteres';
        }
        return '';
    }
}
