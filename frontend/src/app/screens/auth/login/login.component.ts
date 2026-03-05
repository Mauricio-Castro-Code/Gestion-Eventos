import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Auth } from '../../../services/auth';

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
export class LoginComponent implements OnInit {
    loginForm: FormGroup;
    hidePassword = signal(true);
    isSubmitting = signal(false);
    serverError = signal<string | null>(null);

    constructor(
        private readonly fb: FormBuilder,
        private readonly auth: Auth,
        private readonly router: Router,
        private readonly route: ActivatedRoute
    ) {
        this.loginForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(8)]]
        });
    }

    ngOnInit(): void {
        const email = this.route.snapshot.queryParamMap.get('email');
        if (email) {
            this.loginForm.patchValue({ email });
        }
    }

    togglePassword(event: Event) {
        event.preventDefault();
        this.hidePassword.update(value => !value);
    }

    onSubmit() {
        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }

        this.serverError.set(null);
        this.isSubmitting.set(true);

        const payload = this.loginForm.getRawValue() as { email: string; password: string };
        this.auth
            .login(payload)
            .pipe(finalize(() => this.isSubmitting.set(false)))
            .subscribe({
                next: () => {
                    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
                    void this.router.navigateByUrl(returnUrl);
                },
                error: (error: HttpErrorResponse) => {
                    this.serverError.set(this.extractErrorMessage(error));
                }
            });
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

    private extractErrorMessage(error: HttpErrorResponse): string {
        const errorBody = error.error as
            | { detail?: string; non_field_errors?: string[] }
            | string
            | null;

        if (typeof errorBody === 'string' && errorBody.trim()) {
            return errorBody;
        }
        if (errorBody && typeof errorBody === 'object') {
            if (errorBody.detail) {
                return errorBody.detail;
            }
            if (errorBody.non_field_errors?.length) {
                return errorBody.non_field_errors[0];
            }
        }
        return 'No se pudo iniciar sesión. Verifica tus credenciales.';
    }
}
