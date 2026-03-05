from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Category, Enrollment, Event, User, Venue


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Rol y perfil", {"fields": ("role", "career", "phone", "worker_id", "admin_verified_at")}),
    )
    list_display = ("username", "email", "role", "worker_id", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active")


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "created_at")
    search_fields = ("name",)


@admin.register(Venue)
class VenueAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "location", "capacity", "created_at")
    search_fields = ("name", "location")


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "title",
        "organizer",
        "status",
        "start_datetime",
        "end_datetime",
        "max_capacity",
    )
    list_filter = ("status", "start_datetime", "category")
    search_fields = ("title", "description")


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "event",
        "student",
        "status",
        "attended",
        "enrolled_at",
    )
    list_filter = ("status", "attended", "enrolled_at")
    search_fields = ("event__title", "student__username", "student__email")
