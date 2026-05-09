import tempfile
import os
import asyncio
from marker.convert import convert_single_pdf
from marker.models import land_all_models

from abc import ABC, abstractmethod
from fastapi import UploadFile


"""
Функция для загрузки данных в RAG систему.
- file: UploadFile - файл с данными
- client: AsyncOpenAI - клиент для взаимодействия с OpenAI
- store: ElasticsearchVectorStore - хранилище для векторных данных
- embedding_service: EmbeddingService - сервис для векторизации текста
- chunker_service: ChunkerService - сервис для разбиения текста на части
"""
class DataLoadingServiceInterface(ABC):

    @abstractmethod
    async def ingest(self, file: UploadFile) -> None:
        pass

class DataLoadingService(DataLoadingServiceInterface):
    def __init__(self, client, store, embedding_service, chunker_service):
        self._client = client
        self._store = store
        self._embedding_service = embedding_service
        self._chunker_service = chunker_service
        self._models = land_all_models()

    async def ingest(self, file: UploadFile) -> None:

        contents = await file.read()
        def write_tmp() -> str:
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
                tmp.write(contents)
                return tmp.name
        tmp_path = await asyncio.to_thread(write_tmp)
        
        try:
            def parse_pdf() -> str:
                markdown, images, metadata = convert_single_pdf(
                    tmp_path,
                    self._models,
                    max_pages=None,
                    langs=["Russian", "English"],
                )
                return markdown
            markdown = await asyncio.to_thread(parse_pdf)
        finally:
            await asyncio.to_thread(os.unlink, tmp_path)
            