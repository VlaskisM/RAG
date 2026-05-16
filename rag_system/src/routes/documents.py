import logging

from fastapi import APIRouter, HTTPException, Request

from src.routes.schemas import DocumentItemResponse


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/", response_model=list[DocumentItemResponse])
async def list_documents(request: Request):
    try:
        return await request.app.state.data_loading_service.store.list_documents()
    except Exception:
        logger.exception("Ошибка при получении списка документов")
        raise HTTPException(status_code=500, detail="Internal error")
