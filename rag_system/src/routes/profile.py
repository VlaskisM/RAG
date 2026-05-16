import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user
from src.db import get_session
from src.models import Chat, QueryHistory, User
from src.routes.schemas import (
    QueryHistoryItemResponse,
    StatsResponse,
    UserProfileResponse,
    UserProfileUpdate,
    UserSettingsResponse,
    UserSettingsUpdate,
)


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profile", tags=["profile"])


def _settings_response(user: User) -> UserSettingsResponse:
    return UserSettingsResponse(
        theme=user.settings.theme,
        language=user.settings.language,
        show_relevance=user.settings.show_relevance,
        save_history=user.settings.save_history,
    )


def _profile_response(user: User) -> UserProfileResponse:
    return UserProfileResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        department=user.department,
        avatar_url=user.avatar_url,
        settings=_settings_response(user),
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return _profile_response(current_user)


@router.patch("/me", response_model=UserProfileResponse)
async def update_profile(
    payload: UserProfileUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user = await session.merge(current_user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await session.commit()
    await session.refresh(user, attribute_names=["settings"])
    return _profile_response(user)


@router.patch("/settings", response_model=UserSettingsResponse)
async def update_settings(
    payload: UserSettingsUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    user = await session.merge(current_user)
    user_settings = user.settings
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user_settings, field, value)
    await session.commit()
    await session.refresh(user_settings)
    return UserSettingsResponse(
        theme=user_settings.theme,
        language=user_settings.language,
        show_relevance=user_settings.show_relevance,
        save_history=user_settings.save_history,
    )


@router.get("/history", response_model=list[QueryHistoryItemResponse])
async def get_query_history(
    limit: int = 20,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    limit = min(max(limit, 1), 100)
    result = await session.execute(
        select(QueryHistory)
        .where(QueryHistory.user_id == current_user.id)
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


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
async def clear_query_history(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(QueryHistory).where(QueryHistory.user_id == current_user.id)
    )
    for item in result.scalars().all():
        await session.delete(item)
    await session.commit()


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    query_count_result = await session.execute(
        select(func.count(QueryHistory.id)).where(QueryHistory.user_id == current_user.id)
    )
    sources_total_result = await session.execute(
        select(func.coalesce(func.sum(QueryHistory.source_count), 0))
        .where(QueryHistory.user_id == current_user.id)
    )
    chats_count_result = await session.execute(
        select(func.count(Chat.id)).where(Chat.user_id == current_user.id)
    )

    try:
        documents = await request.app.state.data_loading_service.store.list_documents()
        documents_count = len(documents)
    except Exception:
        logger.exception("Failed to load documents count for stats")
        documents_count = 0

    return StatsResponse(
        documents=documents_count,
        queries=int(query_count_result.scalar_one()),
        sources_total=int(sources_total_result.scalar_one()),
        chats=int(chats_count_result.scalar_one()),
    )
