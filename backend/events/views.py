from django.db.models import Q
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

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
from .permissions import (
    IsAdminRole,
    IsEventOwnerOrAdmin,
    IsOrganizerOrAdmin,
    IsStudentOrAdmin,
)
from .serializers import (
    CategorySerializer,
    EnrollmentSerializer,
    EventSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
    VenueSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        if not user.is_active:
            raise AuthenticationFailed("Usuario inactivo.")

        refresh = RefreshToken.for_user(user)
        user_data = UserSerializer(user).data

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": user_data,
            }
        )


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsOrganizerOrAdmin()]
        return [IsAdminRole()]

    def get_queryset(self):
        queryset = User.objects.all().order_by("id")
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            queryset = queryset.filter(is_active=str(is_active).lower() == "true")

        role = self.request.query_params.get("role")
        if role:
            normalized = role.strip().lower()
            if normalized in {"admin", "organizer", "student"}:
                queryset = queryset.filter(role=normalized)
        return queryset

    def _validate_target_user(self, target: User) -> Response | None:
        if target.role == UserRole.ADMIN and target.id != self.request.user.id:
            return Response(
                {"detail": "No puedes editar o eliminar usuarios con rol admin."},
                status=403,
            )
        return None

    def update(self, request, *args, **kwargs):
        target = self.get_object()
        blocked = self._validate_target_user(target)
        if blocked is not None:
            return blocked
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        target = self.get_object()
        blocked = self._validate_target_user(target)
        if blocked is not None:
            return blocked
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        target = self.get_object()
        blocked = self._validate_target_user(target)
        if blocked is not None:
            return blocked
        return super().destroy(request, *args, **kwargs)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsAdminRole()]


class VenueViewSet(viewsets.ModelViewSet):
    queryset = Venue.objects.all().order_by("name")
    serializer_class = VenueSerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsAdminRole()]


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    queryset = Event.objects.select_related("category", "venue", "organizer").all()

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [AllowAny()]
        if self.action in {"create"}:
            return [IsOrganizerOrAdmin()]
        if self.action in {"update", "partial_update", "destroy", "publish", "cancel"}:
            return [IsOrganizerOrAdmin(), IsEventOwnerOrAdmin()]
        if self.action in {"enroll"}:
            return [IsStudentOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        base_qs = Event.objects.select_related("category", "venue", "organizer").all()
        user = self.request.user

        if not user.is_authenticated:
            return base_qs.filter(status=EventStatus.PUBLISHED, is_public=True)
        if user.role == UserRole.ADMIN:
            return base_qs
        if user.role == UserRole.ORGANIZER:
            return base_qs.filter(
                Q(organizer=user) | Q(status=EventStatus.PUBLISHED, is_public=True)
            ).distinct()
        return base_qs.filter(status=EventStatus.PUBLISHED, is_public=True)

    def perform_create(self, serializer):
        organizer = serializer.validated_data.get("organizer")
        if organizer is None:
            serializer.save(organizer=self.request.user)
            return
        serializer.save()

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        event = self.get_object()
        event.status = EventStatus.PUBLISHED
        event.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(event).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        event = self.get_object()
        event.status = EventStatus.CANCELLED
        event.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(event).data)

    @action(detail=True, methods=["post"])
    def enroll(self, request, pk=None):
        event = self.get_object()
        payload = {"event": event.id}
        if request.user.role == UserRole.ADMIN:
            payload["student"] = request.data.get("student")
        serializer = EnrollmentSerializer(data=payload, context={"request": request})
        serializer.is_valid(raise_exception=True)
        enrollment = serializer.save()
        return Response(
            EnrollmentSerializer(enrollment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    queryset = Enrollment.objects.select_related(
        "event", "event__venue", "event__category", "student"
    ).all()

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        if self.action in {"create"}:
            return [IsStudentOrAdmin()]
        if self.action in {"mark_attendance"}:
            return [IsOrganizerOrAdmin()]
        if self.action in {"cancel", "destroy"}:
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def get_queryset(self):
        base_qs = Enrollment.objects.select_related(
            "event", "event__venue", "event__category", "student"
        )
        user = self.request.user

        if user.role == UserRole.ADMIN:
            queryset = base_qs
        elif user.role == UserRole.ORGANIZER:
            queryset = base_qs.filter(event__organizer=user)
        else:
            queryset = base_qs.filter(student=user)

        event_id = self.request.query_params.get("event")
        if event_id and str(event_id).isdigit():
            queryset = queryset.filter(event_id=int(event_id))

        status_value = self.request.query_params.get("status")
        if status_value:
            normalized = status_value.strip().lower()
            if normalized in {
                EnrollmentStatus.CONFIRMED,
                EnrollmentStatus.PENDING,
                EnrollmentStatus.CANCELLED,
            }:
                queryset = queryset.filter(status=normalized)

        return queryset

    def perform_create(self, serializer):
        if self.request.user.role == UserRole.STUDENT:
            serializer.save(student=self.request.user)
            return
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        enrollment = self.get_object()
        if request.user.role == UserRole.STUDENT and enrollment.student_id != request.user.id:
            return Response({"detail": "No puedes cancelar esta inscripción."}, status=403)
        if (
            request.user.role == UserRole.ORGANIZER
            and enrollment.event.organizer_id != request.user.id
        ):
            return Response({"detail": "No puedes cancelar esta inscripción."}, status=403)

        enrollment.cancel()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        enrollment = self.get_object()
        if request.user.role == UserRole.STUDENT and enrollment.student_id != request.user.id:
            return Response({"detail": "No puedes cancelar esta inscripción."}, status=403)
        if (
            request.user.role == UserRole.ORGANIZER
            and enrollment.event.organizer_id != request.user.id
        ):
            return Response({"detail": "No puedes cancelar esta inscripción."}, status=403)
        enrollment.cancel()
        return Response(self.get_serializer(enrollment).data)

    @action(detail=True, methods=["post"])
    def mark_attendance(self, request, pk=None):
        enrollment = self.get_object()
        user = request.user
        if user.role == UserRole.ORGANIZER and enrollment.event.organizer_id != user.id:
            return Response({"detail": "No puedes modificar asistencia en este evento."}, status=403)
        if enrollment.status != EnrollmentStatus.CONFIRMED:
            return Response(
                {"detail": "Solo se marca asistencia en inscripciones activas."},
                status=400,
            )

        attended = request.data.get("attended", True)
        enrollment.attended = bool(attended)
        enrollment.save(update_fields=["attended"])

        return Response(self.get_serializer(enrollment).data)
