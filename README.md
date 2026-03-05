# GTEA - Gestión de Tickets y Eventos Académicos
## Propuesta 1: Modern Glassmorphism (Glass Flux)

Este proyecto es una aplicación web moderna construida con **Angular 20**, diseñada bajo el sistema de diseño **"Glass Flux"** que prioriza la estética premium, efectos de cristal (glassmorphism), gradientes vibrantes y una experiencia de usuario fluida y receptiva.

### 🚀 Tecnologías Clave
- **Framework**: Angular 20 (Standalone Components, Signals, Control Flow `@if/@for`, `@defer`)
- **Estilos**: SCSS con variables CSS nativas, Glassmorphism, Micro-interacciones.
- **Diseño**: "Glass ecosystem" con soporte para modo claro/oscuro (en desarrollo) y diseño responsivo móvil-first.

---

## 🧭 Guía de Interfaces y Acceso

A continuación se detalla el mapa de navegación del proyecto y cómo acceder a cada una de las interfaces desarrolladas.

### 1. Portal Público
La puerta de entrada a la plataforma.
- **Landing Page**
  - **Ruta**: `/` o `/landing`
  - **Descripción**: Página principal con Hero section, características, y llamadas a la acción. Introduce la estética visual del proyecto.

### 2. Autenticación
Interfaces de acceso seguro.
- **Login**
  - **Ruta**: `/auth/login`
  - **Descripción**: Formulario de inicio de sesión con tarjeta de cristal, validaciones reactivas y visibilidad de contraseña.
- **Registro**
  - **Ruta**: `/auth/register`
  - **Descripción**: Pantalla de registro para nuevos usuarios.

### 3. Dashboard Principal (Layout)
- **Ruta Base**: `/dashboard`
- **Descripción**: Contenedor principal para usuarios autenticados. Incluye la barra lateral de navegación (Sidebar) y el área de contenido principal. El acceso a las siguientes rutas asume que estás dentro de este layout.

#### Gestión de Eventos (Admin / Organizador)
Herramientas para la administración de eventos.
- **Listado de Eventos**
  - **Ruta**: `/dashboard/events`
  - **Descripción**: Tabla administradora para ver, buscar y gestionar todos los eventos creados.
- **Crear Nuevo Evento**
  - **Ruta**: `/dashboard/events/new`
  - **Descripción**: Formulario completo para dar de alta un evento (título, fechas, configuración, etc.).
- **Editar Evento**
  - **Ruta**: `/dashboard/events/edit/:id` (Ejemplo: `/dashboard/events/edit/1`)
  - **Descripción**: Mismo formulario de creación precargado con datos para edición.
- **Gestión de Asistencia (Enrollments)**
  - **Ruta**: `/dashboard/events/:id/enrollments` (Ejemplo: `/dashboard/events/101/enrollments`)
  - **Descripción**: Pantalla de "alta velocidad" para tomar asistencia. Incluye HUD de KPIs, lista de estudiantes responsiva y toggle de asistencia rápida.

#### Área del Estudiante
Vista personal para los asistentes.
- **Mis Inscripciones (My Enrollments)**
  - **Ruta**: `/dashboard/my-enrollments`
  - **Descripción**: Dashboard personal del estudiante donde visualizan sus "Tickets de Cristal", estado de sus inscripciones y opciones de cancelación.

---

## 🗂️ Estructura del Proyecto

El proyecto está separado en dos carpetas principales:

- `frontend/` → aplicación Angular
- `backend/` → API Django + DRF

---

## 🛠️ Cómo Ejecutar el Proyecto

### 1) Backend (Django)

```bash
cd backend
source .venv/bin/activate
python manage.py runserver
```

API disponible en `http://127.0.0.1:8000/`

### 2) Frontend (Angular)

```bash
cd frontend
npm install
npm start
# o
ng serve -o
```

Frontend disponible en `http://localhost:4200/`

---

## 🎨 Notas de Diseño
- **Glassmorphism**: Se utiliza extensivamente `backdrop-filter: blur()`, bordes semitransparentes y sombras sutiles para crear profundidad.
- **Responsividad**: Todas las pantallas están optimizadas desde móviles (320px) hasta escritorio (1920px+).
- **Tipografía**: Fuentes modernas (Inter/Outfit) para legibilidad y estilo.
