import logging

from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db import get_session
from src.models import QueryHistory, UserSettings
from src.routes.schemas import QueryRequest, QueryResponse, SourceItem
from src.routes.profile import DEFAULT_USER_ID


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/query", tags=["query"])


@router.post("/", response_model=QueryResponse)
async def ask_query(
    request: Request,
    payload: QueryRequest,
    session: AsyncSession = Depends(get_session),
):
    try:
        answer, chunks = await request.app.state.query_service.ask(payload.question)
        result = await session.execute(
            select(UserSettings).where(UserSettings.user_id == DEFAULT_USER_ID)
        )
        user_settings = result.scalar_one_or_none()
        if user_settings is None or user_settings.save_history:
            session.add(
                QueryHistory(
                    user_id=DEFAULT_USER_ID,
                    question=payload.question,
                    answer=answer,
                    source_count=len(chunks),
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
                for c in chunks
            ],
        )
    except Exception:
        logger.exception("Ошибка при обработке запроса")
        raise HTTPException(status_code=500, detail="Internal error")
