import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth import get_current_user
from src.db import get_session
from src.models import QueryHistory, User, UserSettings
from src.routes.schemas import QueryRequest, QueryResponse, SourceItem


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/query", tags=["query"])


def _has_source_fragment(chunk) -> bool:
    return bool((chunk.text or "").strip() and (chunk.metadata.book or "").strip())


@router.post("/", response_model=QueryResponse)
async def ask_query(
    request: Request,
    payload: QueryRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    try:
        answer, chunks = await request.app.state.query_service.ask(payload.question)
        source_chunks = [chunk for chunk in chunks if _has_source_fragment(chunk)]
        result = await session.execute(
            select(UserSettings).where(UserSettings.user_id == current_user.id)
        )
        user_settings = result.scalar_one_or_none()
        if user_settings is None or user_settings.save_history:
            session.add(
                QueryHistory(
                    user_id=current_user.id,
                    question=payload.question,
                    answer=answer,
                    source_count=len(source_chunks),
                )
            )
            await session.commit()

        return QueryResponse(
            answer=answer,
            sources=[
                SourceItem(
                    fileName=c.metadata.book,
                    text=c.text,
                    score=c.score,
                    page=c.metadata.page,
                    book=c.metadata.book,
                    author=c.metadata.author,
                    part=c.metadata.part_title,
                    chapter=c.metadata.chapter_title,
                    section=c.metadata.section_title,
                    block_type=c.metadata.block_type,
                )
                for c in source_chunks
            ],
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Ошибка при обработке запроса")
        raise HTTPException(status_code=500, detail="Internal error")
