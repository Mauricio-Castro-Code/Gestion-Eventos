
import { Routes } from '@angular/router';
import { LandingComponent } from './screens/landing/landing.component';
import { authGuard, guestGuard, nonAdminCatalogGuard } from './shared/guards/auth-guard';
import { roleGuard } from './shared/guards/role-guard';

export const routes: Routes = [
    {
        path: '',
        component: LandingComponent
    },
    {
        path: 'register',
        redirectTo: 'auth/register',
        pathMatch: 'full'
    },
    {
        path: 'login',
        redirectTo: 'auth/login',
        pathMatch: 'full'
    },
    {
        path: 'landing',
        redirectTo: '',
        pathMatch: 'full'
    },
    {
        path: 'catalog',
        canActivate: [nonAdminCatalogGuard],
        loadComponent: () => import('./screens/events/public-catalog/public-catalog.component').then(m => m.PublicCatalogComponent)
    },
    {
        path: 'events/:id',
        loadComponent: () => import('./screens/events/event-detail/event-detail').then(m => m.EventDetail)
    },
    {
        path: 'auth/login',
        canActivate: [guestGuard],
        loadComponent: () => import('./screens/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'auth/register',
        canActivate: [guestGuard],
        loadComponent: () => import('./screens/auth/register/register.component').then(m => m.RegisterComponent)
    },
    {
        path: 'dashboard',
        canActivate: [authGuard],
        loadComponent: () => import('./screens/dashboard/dashboard.component').then(m => m.DashboardComponent),
        children: [
            {
                path: 'events',
                redirectTo: '',
                pathMatch: 'full'
            },
            {
                path: 'events/new',
                redirectTo: 'events',
                pathMatch: 'full'
            },
            {
                path: 'events/edit/:id',
                redirectTo: 'events',
                pathMatch: 'full'
            },
            {
                path: 'events/:id/enrollments',
                canActivate: [roleGuard],
                data: { roles: ['admin', 'organizer'] },
                loadComponent: () => import('./screens/events/enrollments/enrollments.component').then(m => m.EnrollmentsComponent)
            },
            {
                path: 'users',
                canActivate: [roleGuard],
                data: { roles: ['admin', 'organizer'] },
                loadComponent: () => import('./screens/admin/users/users').then(m => m.UsersComponent)
            },
            {
                path: 'my-enrollments',
                canActivate: [roleGuard],
                data: { roles: ['student'] },
                loadComponent: () => import('./screens/student/my-enrollments/my-enrollments.component').then(m => m.MyEnrollmentsComponent)
            },
            {
                path: 'profile',
                loadComponent: () => import('./screens/profile/profile').then(m => m.Profile)
            }
        ]
    },
    {
        path: '**',
        redirectTo: ''
    }
];
