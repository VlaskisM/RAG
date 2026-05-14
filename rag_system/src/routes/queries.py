import logging

from fastapi import APIRouter, Request, HTTPException

from src.routes.schemas import QueryRequest, QueryResponse, SourceItem


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/query", tags=["query"])


@router.post("/", response_model=QueryResponse)
async def ask_query(
    request: Request,
    payload: QueryRequest,
):
    try:
        answer, chunks = await request.app.state.query_service.ask(payload.question)
        return QueryResponse(
            answer=answer,
            sources=[
                SourceItem(
                    text=c.text,
                    score=c.score,
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
