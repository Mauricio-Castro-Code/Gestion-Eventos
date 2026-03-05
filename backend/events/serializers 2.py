from django.utils import timezone
from rest_framework import serializers

from .models import (
    Category,
    Enrollment,
    EnrollmentStatus,
    Event,
    EventStatus,
    User,
    UserRole,
    Venue,
)


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "career",
            "phone",
            "role",
            "password",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        if "username" not in validated_data:
            validated_data["username"] = validated_data["email"]
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "first_name",
            "last_name",
            "password",
            "career",
            "phone",
            "role",
        ]

    def validate_role(self, value):
        if value == UserRole.ADMIN:
            raise serializers.ValidationError(
                "El registro público no permite crear usuarios administrador."
            )
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


class VenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = "__all__"


class EventSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source="organizer.get_full_name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    venue_name = serializers.CharField(source="venue.name", read_only=True)
    enrolled_count = serializers.IntegerField(read_only=True)
    available_slots = serializers.IntegerField(read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "category",
            "category_name",
            "venue",
            "venue_name",
            "organizer",
            "organizer_name",
            "start_datetime",
            "end_datetime",
            "registration_deadline",
            "max_capacity",
            "status",
            "is_public",
            "image_url",
            "materials_url",
            "enrolled_count",
            "available_slots",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at", "enrolled_count", "available_slots"]

    def validate(self, attrs):
        start = attrs.get("start_datetime", getattr(self.instance, "start_datetime", None))
        end = attrs.get("end_datetime", getattr(self.instance, "end_datetime", None))
        deadline = attrs.get(
            "registration_deadline",
            getattr(self.instance, "registration_deadline", None),
        )
        organizer = attrs.get("organizer", getattr(self.instance, "organizer", None))

        if start and end and end <= start:
            raise serializers.ValidationError(
                {"end_datetime": "La fecha de fin debe ser mayor a la de inicio."}
            )
        if deadline and start and deadline >= start:
            raise serializers.ValidationError(
                {
                    "registration_deadline": (
                        "La fecha límite de inscripción debe ser antes del inicio."
                    )
                }
            )
        if organizer and organizer.role not in {UserRole.ADMIN, UserRole.ORGANIZER}:
            raise serializers.ValidationError(
                {"organizer": "El organizador debe tener rol admin u organizador."}
            )

        return attrs


class EnrollmentSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source="event.title", read_only=True)
    student_name = serializers.CharField(source="student.get_full_name", read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "event",
            "event_title",
            "student",
            "student_name",
            "status",
            "attended",
            "enrolled_at",
            "cancelled_at",
        ]
        read_only_fields = ["enrolled_at", "cancelled_at"]

    def validate(self, attrs):
        request = self.context["request"]
        event = attrs.get("event", getattr(self.instance, "event", None))
        student = attrs.get("student")

        if request.user.role == UserRole.STUDENT:
            student = request.user
            attrs["student"] = student

        if not student:
            raise serializers.ValidationError({"student": "Debe especificarse el estudiante."})

        if event and event.status != EventStatus.PUBLISHED:
            raise serializers.ValidationError(
                {"event": "Solo puedes inscribirte en eventos publicados."}
            )

        now = timezone.now()
        if event and event.registration_deadline and now > event.registration_deadline:
            raise serializers.ValidationError(
                {"event": "El periodo de inscripción ya terminó para este evento."}
            )

        if event and event.start_datetime <= now:
            raise serializers.ValidationError(
                {"event": "No puedes inscribirte en eventos ya iniciados."}
            )

        if event:
            enrolled_count = event.enrollments.filter(
                status=EnrollmentStatus.ENROLLED
            ).exclude(student=student).count()
            if enrolled_count >= event.max_capacity:
                raise serializers.ValidationError(
                    {"event": "No hay cupos disponibles para este evento."}
                )

            existing = Enrollment.objects.filter(event=event, student=student).first()
            if existing and existing.status == EnrollmentStatus.ENROLLED:
                raise serializers.ValidationError(
                    {"event": "Ya estás inscrito en este evento."}
                )

        return attrs

    def create(self, validated_data):
        event = validated_data["event"]
        student = validated_data["student"]
        defaults = {
            "status": validated_data.get("status", EnrollmentStatus.ENROLLED),
            "attended": validated_data.get("attended", False),
        }
        enrollment, created = Enrollment.objects.get_or_create(
            event=event, student=student, defaults=defaults
        )

        if not created and enrollment.status == EnrollmentStatus.CANCELLED:
            enrollment.status = EnrollmentStatus.ENROLLED
            enrollment.cancelled_at = None
            enrollment.attended = False
            enrollment.save(update_fields=["status", "cancelled_at", "attended"])
            return enrollment

        if not created:
            raise serializers.ValidationError({"event": "Ya existe una inscripción activa."})
        return enrollment
