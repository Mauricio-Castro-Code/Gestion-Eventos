
import { Routes } from '@angular/router';
import { LandingComponent } from './screens/landing/landing.component';

export const routes: Routes = [
    {
        path: '',
        component: LandingComponent
    },
    {
        path: 'landing',
        redirectTo: '',
        pathMatch: 'full'
    },
    {
        path: 'auth/login',
        loadComponent: () => import('./screens/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'auth/register',
        loadComponent: () => import('./screens/auth/register/register.component').then(m => m.RegisterComponent)
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./screens/dashboard/dashboard.component').then(m => m.DashboardComponent),
        children: [
            {
                path: 'events',
                loadComponent: () => import('./screens/events/events-list/events-list.component').then(m => m.EventsListComponent)
            },
            {
                path: 'events/new',
                loadComponent: () => import('./screens/events/event-form/event-form').then(m => m.EventForm)
            },
            {
                path: 'events/edit/:id',
                loadComponent: () => import('./screens/events/event-form/event-form').then(m => m.EventForm)
            },
            {
                path: 'events/:id/enrollments',
                loadComponent: () => import('./screens/events/enrollments/enrollments.component').then(m => m.EnrollmentsComponent)
            },
            {
                path: 'my-enrollments',
                loadComponent: () => import('./screens/student/my-enrollments/my-enrollments.component').then(m => m.MyEnrollmentsComponent)
            }
        ]
    }
];
