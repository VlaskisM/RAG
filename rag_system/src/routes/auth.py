import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from src.db import get_session
from src.models import User, UserSettings
from src.routes.schemas import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UserProfileResponse,
    UserSettingsResponse,
)


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


def _profile_response(user: User) -> UserProfileResponse:
    return UserProfileResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        department=user.department,
        avatar_url=user.avatar_url,
        settings=UserSettingsResponse(
            theme=user.settings.theme,
            language=user.settings.language,
            show_relevance=user.settings.show_relevance,
            save_history=user.settings.save_history,
        ),
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, session: AsyncSession = Depends(get_session)):
    email = payload.email.lower()
    existing = await session.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role or "Knowledge Worker",
        department=payload.department or "Operations",
    )
    session.add(user)
    await session.flush()
    session.add(UserSettings(user_id=user.id))
    await session.commit()

    await session.refresh(user, attribute_names=["settings"])

    token = create_access_token(user.id)
    return AuthResponse(token=token, profile=_profile_response(user))


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_session)):
    email = payload.email.lower()
    result = await session.execute(
        select(User).options(selectinload(User.settings)).where(User.email == email)
    )
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(user.id)
    return AuthResponse(token=token, profile=_profile_response(user))


@router.get("/me", response_model=UserProfileResponse)
async def me(current_user: User = Depends(get_current_user)):
    return _profile_response(current_user)
