import logging

from fastapi import APIRouter, Depends, HTTPException, Request

from src.auth import get_current_user
from src.models import User
from src.routes.schemas import DocumentItemResponse


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/", response_model=list[DocumentItemResponse])
async def list_documents(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    try:
        return await request.app.state.data_loading_service.store.list_documents()
    except Exception:
        logger.exception("Ошибка при получении списка документов")
        raise HTTPException(status_code=500, detail="Internal error")
