import logging
from typing import Annotated

from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form

from src.routes.schemas import IngestResponse


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/data-loading", tags=["data-loading"])


@router.post("/", response_model=IngestResponse)
async def load_data(
    request: Request,
    file: Annotated[UploadFile, File(description="PDF-файл учебника")],
    book: Annotated[str, Form(description="Название книги")],
    author: Annotated[str | None, Form(description="Автор книги")] = None,
):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Только PDF файлы поддерживаются")

    try:
        await request.app.state.data_loading_service.ingest(file, book=book, author=author)
        return IngestResponse(message=f"'{book}' успешно загружена")
    except Exception:
        logger.exception("Ошибка при загрузке данных")
        raise HTTPException(status_code=500, detail="Internal error")
