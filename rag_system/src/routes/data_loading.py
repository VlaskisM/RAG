import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from src.auth import get_current_user
from src.models import User
from src.routes.schemas import IngestResponse


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/data-loading", tags=["data-loading"])


@router.post("/", response_model=IngestResponse)
async def load_data(
    request: Request,
    file: Annotated[UploadFile, File(description="PDF-файл учебника")],
    book: Annotated[str, Form(description="Название книги")],
    author: Annotated[Optional[str], Form(description="Автор книги")] = None,
    current_user: User = Depends(get_current_user),
):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Только PDF файлы поддерживаются")

    try:
        chunks_indexed = await request.app.state.data_loading_service.ingest(
            file, book=book, author=author or current_user.name,
        )
        return IngestResponse(
            message=f"'{book}' успешно загружена",
            book=book,
            chunks=chunks_indexed,
        )
    except Exception:
        logger.exception("Ошибка при загрузке данных")
        raise HTTPException(status_code=500, detail="Internal error")
