from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db import get_session
from src.models import QueryHistory, User, UserSettings
from src.routes.schemas import (
    QueryHistoryItemResponse,
    UserProfileResponse,
    UserProfileUpdate,
    UserSettingsResponse,
    UserSettingsUpdate,
)


router = APIRouter(prefix="/profile", tags=["profile"])

DEFAULT_USER_ID = 1


def _settings_response(settings: UserSettings) -> UserSettingsResponse:
    return UserSettingsResponse(
        theme=settings.theme,
        language=settings.language,
        show_relevance=settings.show_relevance,
        save_history=settings.save_history,
    )


def _profile_response(user: User) -> UserProfileResponse:
    return UserProfileResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        department=user.department,
        avatar_url=user.avatar_url,
        settings=_settings_response(user.settings),
    )


async def _get_current_user(session: AsyncSession) -> User:
    result = await session.execute(
        select(User)
        .options(selectinload(User.settings))
        .where(User.id == DEFAULT_USER_ID)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/me", response_model=UserProfileResponse)
async def get_profile(session: AsyncSession = Depends(get_session)):
    user = await _get_current_user(session)
    return _profile_response(user)


@router.patch("/me", response_model=UserProfileResponse)
async def update_profile(
    payload: UserProfileUpdate,
    session: AsyncSession = Depends(get_session),
):
    user = await _get_current_user(session)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)

    await session.commit()
    await session.refresh(user, attribute_names=["settings"])
    return _profile_response(user)


@router.patch("/settings", response_model=UserSettingsResponse)
async def update_settings(
    payload: UserSettingsUpdate,
    session: AsyncSession = Depends(get_session),
):
    user = await _get_current_user(session)
    settings = user.settings

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)

    await session.commit()
    await session.refresh(settings)
    return _settings_response(settings)


@router.get("/history", response_model=list[QueryHistoryItemResponse])
async def get_query_history(
    limit: int = 20,
    session: AsyncSession = Depends(get_session),
):
    limit = min(max(limit, 1), 100)
    result = await session.execute(
        select(QueryHistory)
        .where(QueryHistory.user_id == DEFAULT_USER_ID)
        .order_by(desc(QueryHistory.created_at))
        .limit(limit)
    )

    return [
        QueryHistoryItemResponse(
            id=item.id,
            question=item.question,
            answer=item.answer,
            source_count=item.source_count,
            created_at=item.created_at.isoformat(),
        )
        for item in result.scalars().all()
    ]


@router.delete("/history", status_code=204)
async def clear_query_history(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        select(QueryHistory).where(QueryHistory.user_id == DEFAULT_USER_ID)
    )
    for item in result.scalars().all():
        await session.delete(item)
    await session.commit()
