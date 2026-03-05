from django.conf import settings
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


ROLE_INPUT_MAP = {
    "admin": UserRole.ADMIN,
    "administrador": UserRole.ADMIN,
    "organizer": UserRole.ORGANIZER,
    "organizador": UserRole.ORGANIZER,
    "student": UserRole.STUDENT,
    "estudiante": UserRole.STUDENT,
}


def normalize_role(value: str) -> str:
    if value is None:
        return UserRole.STUDENT
    normalized = ROLE_INPUT_MAP.get(str(value).strip().lower())
    if not normalized:
        raise serializers.ValidationError("Rol invalido. Usa admin, organizer o student.")
    return normalized


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    firstName = serializers.CharField(source="first_name", read_only=True)
    lastName = serializers.CharField(source="last_name", read_only=True)
    workerId = serializers.CharField(source="worker_id", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "firstName",
            "lastName",
            "career",
            "phone",
            "role",
            "worker_id",
            "workerId",
            "admin_verified_at",
            "password",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "admin_verified_at",
            "firstName",
            "lastName",
            "workerId",
        ]

    def to_internal_value(self, data):
        payload = dict(data)
        if "firstName" in payload and "first_name" not in payload:
            payload["first_name"] = payload["firstName"]
        if "lastName" in payload and "last_name" not in payload:
            payload["last_name"] = payload["lastName"]
        if "workerId" in payload and "worker_id" not in payload:
            payload["worker_id"] = payload["workerId"]
        if "role" in payload:
            payload["role"] = normalize_role(payload["role"])
        return super().to_internal_value(payload)

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


class RegisterSerializer(serializers.Serializer):
    firstName = serializers.CharField(required=False)
    lastName = serializers.CharField(required=False)
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)
    username = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.CharField(required=False, default=UserRole.STUDENT)
    workerId = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    worker_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    adminKey = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    career = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        role = normalize_role(attrs.get("role"))
        attrs["role"] = role

        first_name = attrs.get("first_name") or attrs.get("firstName")
        last_name = attrs.get("last_name") or attrs.get("lastName")
        worker_id = attrs.get("worker_id") or attrs.get("workerId")
        admin_key = attrs.get("adminKey")

        if not first_name:
            raise serializers.ValidationError({"firstName": "El nombre es requerido."})
        if not last_name:
            raise serializers.ValidationError({"lastName": "El apellido es requerido."})

        if role == UserRole.ORGANIZER and not worker_id:
            raise serializers.ValidationError(
                {"workerId": "El ID de trabajador es requerido para organizador."}
            )

        if role == UserRole.ADMIN:
            expected_key = getattr(settings, "ADMIN_MASTER_KEY", "")
            if not expected_key:
                raise serializers.ValidationError(
                    {"adminKey": "No hay clave maestra configurada en el servidor."}
                )
            if not admin_key:
                raise serializers.ValidationError(
                    {"adminKey": "La clave maestra es requerida para admin."}
                )
            if admin_key != expected_key:
                raise serializers.ValidationError({"adminKey": "Clave maestra incorrecta."})

        attrs["first_name"] = first_name
        attrs["last_name"] = last_name
        attrs["worker_id"] = worker_id or None
        return attrs

    def create(self, validated_data):
        email = validated_data["email"].strip().lower()
        username = (validated_data.get("username") or "").strip()
        role = validated_data["role"]

        if not username:
            base_username = email.split("@")[0]
            username = base_username
            suffix = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{suffix}"
                suffix += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            password=validated_data["password"],
            role=role,
            career=validated_data.get("career", ""),
            phone=validated_data.get("phone", ""),
            worker_id=validated_data.get("worker_id"),
        )

        if role == UserRole.ADMIN:
            user.is_staff = True
            user.admin_verified_at = timezone.now()
            user.save(update_fields=["is_staff", "admin_verified_at"])

        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        password = attrs["password"]
        user = User.objects.filter(email__iexact=email).first()

        if not user or not user.check_password(password):
            raise serializers.ValidationError("Credenciales invalidas.")
        if not user.is_active:
            raise serializers.ValidationError("Usuario inactivo.")

        attrs["user"] = user
        return attrs


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"
        extra_kwargs = {
            "name": {"validators": []},
        }

    def validate_name(self, value):
        normalized = value.strip()
        if not normalized:
            raise serializers.ValidationError("El nombre de la categoría es requerido.")
        return normalized

    def create(self, validated_data):
        name = validated_data["name"].strip()
        description = (validated_data.get("description") or "").strip()
        existing = Category.objects.filter(name__iexact=name).first()
        if existing:
            return existing
        return Category.objects.create(name=name, description=description)

    def update(self, instance, validated_data):
        if "name" in validated_data:
            validated_data["name"] = validated_data["name"].strip()
        if "description" in validated_data and validated_data["description"] is not None:
            validated_data["description"] = validated_data["description"].strip()
        return super().update(instance, validated_data)


class VenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Venue
        fields = "__all__"
        validators = []

    def validate(self, attrs):
        name = (attrs.get("name") or "").strip()
        location = (attrs.get("location") or "").strip()
        address = (attrs.get("address") or "").strip()

        if not name:
            raise serializers.ValidationError({"name": "El nombre de la sede es requerido."})
        if not location:
            raise serializers.ValidationError(
                {"location": "La ubicación de la sede es requerida."}
            )

        attrs["name"] = name
        attrs["location"] = location
        attrs["address"] = address
        return attrs

    def create(self, validated_data):
        name = validated_data["name"]
        location = validated_data["location"]
        existing = Venue.objects.filter(name__iexact=name, location__iexact=location).first()
        if existing:
            return existing
        return Venue.objects.create(**validated_data)

    def update(self, instance, validated_data):
        if "name" in validated_data:
            validated_data["name"] = validated_data["name"].strip()
        if "location" in validated_data:
            validated_data["location"] = validated_data["location"].strip()
        if "address" in validated_data and validated_data["address"] is not None:
            validated_data["address"] = validated_data["address"].strip()
        return super().update(instance, validated_data)


class EventSerializer(serializers.ModelSerializer):
    organizer_name = serializers.CharField(source="organizer.get_full_name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    venue_name = serializers.CharField(source="venue.name", read_only=True)
    enrolled_count = serializers.IntegerField(read_only=True)
    attendees = serializers.IntegerField(source="enrolled_count", read_only=True)
    available_slots = serializers.IntegerField(read_only=True)
    capacityPercentage = serializers.SerializerMethodField()
    startDate = serializers.DateTimeField(source="start_datetime", read_only=True)
    endDate = serializers.DateTimeField(source="end_datetime", read_only=True)
    venueId = serializers.IntegerField(source="venue_id", read_only=True)
    capacity = serializers.IntegerField(source="max_capacity", read_only=True)
    materials = serializers.CharField(source="materials_url", read_only=True)
    statusLabel = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "title",
            "description",
            "requirements",
            "category",
            "category_name",
            "venue",
            "venue_name",
            "venueId",
            "organizer",
            "organizer_name",
            "start_datetime",
            "end_datetime",
            "startDate",
            "endDate",
            "registration_deadline",
            "max_capacity",
            "capacity",
            "modality",
            "status",
            "statusLabel",
            "is_public",
            "image_url",
            "materials_url",
            "materials",
            "enrolled_count",
            "attendees",
            "available_slots",
            "capacityPercentage",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "enrolled_count",
            "attendees",
            "available_slots",
            "capacityPercentage",
            "startDate",
            "endDate",
            "venueId",
            "capacity",
            "materials",
            "statusLabel",
        ]

    def to_internal_value(self, data):
        payload = dict(data)
        aliases = {
            "venueId": "venue",
            "startDate": "start_datetime",
            "endDate": "end_datetime",
            "capacity": "max_capacity",
            "materials": "materials_url",
            "isPublic": "is_public",
        }
        for source_key, target_key in aliases.items():
            if source_key in payload and target_key not in payload:
                payload[target_key] = payload[source_key]

        category_value = payload.get("category")
        if isinstance(category_value, str) and category_value and not category_value.isdigit():
            category, _ = Category.objects.get_or_create(name=category_value.strip())
            payload["category"] = category.id

        return super().to_internal_value(payload)

    def validate(self, attrs):
        start = attrs.get("start_datetime", getattr(self.instance, "start_datetime", None))
        end = attrs.get("end_datetime", getattr(self.instance, "end_datetime", None))
        deadline = attrs.get(
            "registration_deadline",
            getattr(self.instance, "registration_deadline", None),
        )
        organizer = attrs.get("organizer", getattr(self.instance, "organizer", None))
        venue = attrs.get("venue", getattr(self.instance, "venue", None))
        max_capacity = attrs.get("max_capacity", getattr(self.instance, "max_capacity", None))

        if start and end and end <= start:
            raise serializers.ValidationError(
                {"end_datetime": "La fecha de fin debe ser mayor a la de inicio."}
            )
        if deadline and start and deadline >= start:
            raise serializers.ValidationError(
                {
                    "registration_deadline": (
                        "La fecha limite de inscripcion debe ser antes del inicio."
                    )
                }
            )
        if organizer and organizer.role not in {UserRole.ADMIN, UserRole.ORGANIZER}:
            raise serializers.ValidationError(
                {"organizer": "El organizador debe tener rol admin u organizer."}
            )
        if venue and max_capacity and max_capacity > venue.capacity:
            raise serializers.ValidationError(
                {"max_capacity": "El cupo maximo no puede exceder la capacidad de la sede."}
            )

        return attrs

    def get_capacityPercentage(self, obj):
        if obj.max_capacity <= 0:
            return 0
        return int((obj.enrolled_count / obj.max_capacity) * 100)


class EnrollmentSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source="event.title", read_only=True)
    event_start_datetime = serializers.DateTimeField(
        source="event.start_datetime", read_only=True
    )
    event_end_datetime = serializers.DateTimeField(
        source="event.end_datetime", read_only=True
    )
    event_status = serializers.CharField(source="event.status", read_only=True)
    venue_name = serializers.CharField(source="event.venue.name", read_only=True)
    student_name = serializers.CharField(source="student.get_full_name", read_only=True)
    student_email = serializers.EmailField(source="student.email", read_only=True)
    student_username = serializers.CharField(source="student.username", read_only=True)
    eventId = serializers.IntegerField(source="event_id", read_only=True)
    studentId = serializers.IntegerField(source="student_id", read_only=True)
    statusLabel = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            "id",
            "event",
            "eventId",
            "event_title",
            "event_start_datetime",
            "event_end_datetime",
            "event_status",
            "venue_name",
            "student",
            "studentId",
            "student_name",
            "student_email",
            "student_username",
            "status",
            "statusLabel",
            "attended",
            "enrolled_at",
            "cancelled_at",
        ]
        validators = []
        extra_kwargs = {
            "student": {"required": False},
        }
        read_only_fields = ["enrolled_at", "cancelled_at", "eventId", "studentId", "statusLabel"]

    def to_internal_value(self, data):
        payload = dict(data)
        if "eventId" in payload and "event" not in payload:
            payload["event"] = payload["eventId"]
        if "studentId" in payload and "student" not in payload:
            payload["student"] = payload["studentId"]
        return super().to_internal_value(payload)

    def validate(self, attrs):
        request = self.context["request"]
        event = attrs.get("event", getattr(self.instance, "event", None))
        student = attrs.get("student")

        if request.user.role == UserRole.STUDENT:
            student = request.user
            attrs["student"] = student

        if not student:
            raise serializers.ValidationError({"student": "Debes indicar el estudiante."})

        if event and event.status != EventStatus.PUBLISHED:
            raise serializers.ValidationError(
                {"event": "Solo puedes inscribirte en eventos publicados."}
            )

        now = timezone.now()
        if event and event.registration_deadline and now > event.registration_deadline:
            raise serializers.ValidationError(
                {"event": "El periodo de inscripcion ya termino para este evento."}
            )

        if event and event.start_datetime <= now:
            raise serializers.ValidationError(
                {"event": "No puedes inscribirte en eventos ya iniciados."}
            )

        if event:
            enrolled_count = event.enrollments.filter(
                status=EnrollmentStatus.CONFIRMED
            ).exclude(student=student).count()
            if enrolled_count >= event.max_capacity:
                raise serializers.ValidationError(
                    {"event": "No hay cupos disponibles para este evento."}
                )

        return attrs

    def create(self, validated_data):
        event = validated_data["event"]
        student = validated_data["student"]
        defaults = {
            "status": validated_data.get("status", EnrollmentStatus.CONFIRMED),
            "attended": validated_data.get("attended", False),
        }
        enrollment, created = Enrollment.objects.get_or_create(
            event=event, student=student, defaults=defaults
        )

        if not created and enrollment.status == EnrollmentStatus.CANCELLED:
            enrollment.status = EnrollmentStatus.CONFIRMED
            enrollment.cancelled_at = None
            enrollment.attended = False
            enrollment.save(update_fields=["status", "cancelled_at", "attended"])
            return enrollment

        if not created:
            return enrollment
        return enrollment
