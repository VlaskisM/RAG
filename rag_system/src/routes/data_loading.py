from typing import Annotated
from fastapi import APIRouter, Request, HTTPException, UploadFile, File, Form


router = APIRouter(prefix="/data-loading", tags=["data-loading"])


@router.post("/")
async def load_data(
    request: Request,
    file: Annotated[UploadFile, File(description="PDF-файл учебника")],
    book: Annotated[str, Form(description="Название книги")],
    author: Annotated[str | None, Form(description="Автор книги")] = None,
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Только PDF файлы поддерживаются")

    try:
        await request.app.state.data_loading_service.ingest(file, book=book, author=author)
        return {"message": f"'{book}' успешно загружена"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
