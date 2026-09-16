from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.v1.deps import auth_abuse_guard, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserPublic,
    VerifyEmailRequest,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

RESEND_MESSAGE = "If an account exists for this email, a verification link has been sent."
RESET_REQUEST_MESSAGE = "If an account exists for this email, a password reset link has been sent."
RESET_DONE_MESSAGE = "Password has been reset. You can sign in with your new password."
LOGOUT_MESSAGE = "Signed out."
LOGOUT_ALL_MESSAGE = "All sessions have been signed out."
PASSWORD_CHANGED_MESSAGE = "Password has been changed. Please sign in again."


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)


@router.post(
    "/register",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(auth_abuse_guard)],
)
def register(
    payload: RegisterRequest,
    service: AuthService = Depends(get_auth_service),
) -> User:
    return service.register(payload)


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(auth_abuse_guard)],
)
def login(
    payload: LoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    return service.login(payload)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    payload: RefreshRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    return service.refresh(payload.refresh_token)


@router.post("/logout", response_model=MessageResponse)
def logout(
    payload: RefreshRequest,
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    service.logout(payload.refresh_token)
    return MessageResponse(message=LOGOUT_MESSAGE)


@router.post("/logout-all", response_model=MessageResponse)
def logout_all(
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    service.logout_all(current_user)
    return MessageResponse(message=LOGOUT_ALL_MESSAGE)


@router.post(
    "/verify-email",
    response_model=UserPublic,
    dependencies=[Depends(auth_abuse_guard)],
)
def verify_email(
    payload: VerifyEmailRequest,
    service: AuthService = Depends(get_auth_service),
) -> User:
    return service.verify_email(payload.token)


@router.post(
    "/resend-verification",
    response_model=MessageResponse,
    dependencies=[Depends(auth_abuse_guard)],
)
def resend_verification(
    payload: ResendVerificationRequest,
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    service.resend_verification(str(payload.email))
    return MessageResponse(message=RESEND_MESSAGE)


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    dependencies=[Depends(auth_abuse_guard)],
)
def forgot_password(
    payload: ForgotPasswordRequest,
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    service.request_password_reset(str(payload.email))
    return MessageResponse(message=RESET_REQUEST_MESSAGE)


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    dependencies=[Depends(auth_abuse_guard)],
)
def reset_password(
    payload: ResetPasswordRequest,
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    service.reset_password(payload.token, payload.new_password)
    return MessageResponse(message=RESET_DONE_MESSAGE)


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
) -> MessageResponse:
    service.change_password(current_user, payload.current_password, payload.new_password)
    return MessageResponse(message=PASSWORD_CHANGED_MESSAGE)


@router.get("/me", response_model=UserPublic)
def read_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
