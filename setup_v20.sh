#!/bin/bash

echo "🚀 Iniciando configuración de GTEA para Angular 20..."

# --- 1. SCREENS (Vistas) ---
echo "📂 Generando Screens..."

# Públicas
ng g c screens/landing --display-block
ng g c screens/auth/login --display-block
ng g c screens/auth/register --display-block

# Dashboard y Perfil
ng g c screens/dashboard --display-block
ng g c screens/profile --display-block

# Eventos (Estructura jerárquica)
ng g c screens/events/events-list --display-block   # /events/list
ng g c screens/events/event-detail --display-block  # /events/detail/:id
ng g c screens/events/event-form --display-block    # /events/form

# Inscripciones (Estudiante)
ng g c screens/enrollments/my-enrollments --display-block # /enrollments/my

# Administración
ng g c screens/admin/users --display-block
ng g c screens/admin/categories --display-block
ng g c screens/admin/venues --display-block
ng g c screens/reports --display-block

# --- 2. PARTIALS (Componentes de UI) ---
echo "🧩 Generando Partials..."
ng g c partials/navbar
ng g c partials/sidebar
ng g c partials/footer
ng g c partials/breadcrumbs
ng g c partials/toast-alerts

# --- 3. MODALS (Ventanas Emergentes) ---
echo "💬 Generando Modales..."
ng g c modals/confirm-delete-modal
ng g c modals/confirm-action-modal    # Genérico: publicar/cancelar/inscribir
ng g c modals/event-publish-modal
ng g c modals/enrollment-cancel-modal
ng g c modals/role-change-modal

# --- 4. SERVICES (Backend Django) ---
echo "sw Generando Servicios..."
ng g s services/auth
ng g s services/users
ng g s services/events
ng g s services/enrollments
ng g s services/categories
ng g s services/venues
ng g s services/reports

# --- 5. SHARED (Core) ---
echo "🛡️ Generando Guards, Interceptors e Interfaces..."

# Guards funcionales (Functional Guards son el estándar en v20)
ng g guard shared/guards/auth --implements CanActivate
ng g guard shared/guards/role --implements CanActivate

# Interceptors funcionales
ng g interceptor shared/interceptors/jwt
ng g interceptor shared/interceptors/error

# Interfaces (Modelos)
# Angular CLI no tiene generador nativo de interfaces vacías por defecto en todas las versiones,
# pero creamos los archivos manualmente o usamos ng g i si está disponible.
ng g i shared/models/user
ng g i shared/models/role
ng g i shared/models/event
ng g i shared/models/category
ng g i shared/models/venue
ng g i shared/models/enrollment
ng g i shared/models/api-response

echo "✅ Estructura GTEA (Angular 20) creada exitosamente."
