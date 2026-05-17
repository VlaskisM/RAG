import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status

from src.auth import get_current_user
from src.models import User
from src.routes.schemas import CodeReviewRequest, CodeReviewResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/code-review", tags=["code-review"])


@router.post("/", response_model=CodeReviewResponse)
async def review_code(
    payload: CodeReviewRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    try:
        review = await request.app.state.code_review_service.review(
            code=payload.code,
            filename=payload.filename,
            question=payload.question,
        )
    except Exception:
        logger.exception("Error during code review for user %s", current_user.id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal error")
    return CodeReviewResponse(review=review)
