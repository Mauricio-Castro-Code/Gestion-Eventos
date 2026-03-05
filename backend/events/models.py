from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class UserRole(models.TextChoices):
    ADMIN = "admin", "Administrador"
    ORGANIZER = "organizer", "Organizador"
    STUDENT = "student", "Estudiante"


class EventStatus(models.TextChoices):
    DRAFT = "borrador", "Borrador"
    PUBLISHED = "publicado", "Publicado"
    CANCELLED = "cancelado", "Cancelado"


class EventModality(models.TextChoices):
    IN_PERSON = "presencial", "Presencial"
    VIRTUAL = "virtual", "Virtual"
    HYBRID = "hibrido", "Hibrido"


class EnrollmentStatus(models.TextChoices):
    CONFIRMED = "confirmed", "Confirmado"
    PENDING = "pending", "Pendiente"
    CANCELLED = "cancelled", "Cancelado"


class User(AbstractUser):
    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20, choices=UserRole.choices, default=UserRole.STUDENT
    )
    career = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    worker_id = models.CharField(max_length=64, blank=True, null=True, unique=True)
    admin_verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Venue(models.Model):
    name = models.CharField(max_length=150)
    location = models.CharField(max_length=180)
    address = models.CharField(max_length=255, blank=True)
    capacity = models.PositiveIntegerField(default=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = ("name", "location")

    def __str__(self):
        return f"{self.name} - {self.location}"


class Event(models.Model):
    title = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    requirements = models.TextField(blank=True)
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="events"
    )
    venue = models.ForeignKey(Venue, on_delete=models.PROTECT, related_name="events")
    organizer = models.ForeignKey(
        "User", on_delete=models.CASCADE, related_name="organized_events"
    )
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    registration_deadline = models.DateTimeField(null=True, blank=True)
    max_capacity = models.PositiveIntegerField(default=50)
    modality = models.CharField(
        max_length=20, choices=EventModality.choices, default=EventModality.IN_PERSON
    )
    status = models.CharField(
        max_length=20, choices=EventStatus.choices, default=EventStatus.DRAFT
    )
    is_public = models.BooleanField(default=True)
    image_url = models.URLField(blank=True)
    materials_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_datetime"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["start_datetime"]),
        ]

    def clean(self):
        if self.end_datetime <= self.start_datetime:
            raise ValidationError("La fecha de fin debe ser mayor a la fecha de inicio.")
        if (
            self.registration_deadline
            and self.registration_deadline >= self.start_datetime
        ):
            raise ValidationError(
                "La fecha límite de inscripción debe ser antes del inicio del evento."
            )
        if self.organizer.role not in {UserRole.ADMIN, UserRole.ORGANIZER}:
            raise ValidationError("Solo admin u organizador pueden crear eventos.")

    @property
    def enrolled_count(self):
        return self.enrollments.filter(status=EnrollmentStatus.CONFIRMED).count()

    @property
    def available_slots(self):
        return max(self.max_capacity - self.enrolled_count, 0)

    def __str__(self):
        return self.title


class Enrollment(models.Model):
    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="enrollments"
    )
    student = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="enrollments"
    )
    status = models.CharField(
        max_length=20,
        choices=EnrollmentStatus.choices,
        default=EnrollmentStatus.CONFIRMED,
    )
    attended = models.BooleanField(default=False)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-enrolled_at"]
        unique_together = ("event", "student")
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["enrolled_at"]),
        ]

    def clean(self):
        if self.student.role != UserRole.STUDENT:
            raise ValidationError("Solo usuarios con rol estudiante pueden inscribirse.")

    def cancel(self):
        if self.status != EnrollmentStatus.CANCELLED:
            self.status = EnrollmentStatus.CANCELLED
            self.cancelled_at = timezone.now()
            self.save(update_fields=["status", "cancelled_at"])

    def __str__(self):
        return f"{self.student.username} -> {self.event.title}"
