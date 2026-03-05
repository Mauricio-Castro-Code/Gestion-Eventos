from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CategoryViewSet,
    EnrollmentViewSet,
    EventViewSet,
    LoginView,
    ProfileView,
    RegisterView,
    UserViewSet,
    VenueViewSet,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="users")
router.register("categories", CategoryViewSet, basename="categories")
router.register("venues", VenueViewSet, basename="venues")
router.register("events", EventViewSet, basename="events")
router.register("enrollments", EnrollmentViewSet, basename="enrollments")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/me/", ProfileView.as_view(), name="profile"),
    path("", include(router.urls)),
]
