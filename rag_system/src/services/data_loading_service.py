import logging
import time
from abc import ABC, abstractmethod
from typing import Optional

from fastapi import UploadFile

from src.services.document_conversion_service import DocumentConversionServiceInterface
from src.services.chunker_service import ChunkerServiceInterface
from src.services.embeding_service import EmbeddingServiceInterface


logger = logging.getLogger(__name__)


class DataLoadingServiceInterface(ABC):

    @abstractmethod
    async def ingest(self, file: UploadFile, book: str, author: Optional[str] = None) -> None:
        pass


class DataLoadingService(DataLoadingServiceInterface):
    def __init__(
        self,
        store,
        embedding_service: EmbeddingServiceInterface,
        chunker_service: ChunkerServiceInterface,
        document_conversion_service: DocumentConversionServiceInterface,
    ):
        self._store = store
        self._embedding_service = embedding_service
        self._chunker_service = chunker_service
        self._document_conversion_service = document_conversion_service

    @property
    def store(self):
        return self._store

    async def ingest(self, file: UploadFile, book: str, author: Optional[str] = None) -> None:

        start = time.perf_counter()
        logger.info(
            "Starting ingestion: filename=%s book=%s author=%s size=%s",
            file.filename,
            book,
            author,
            getattr(file, "size", None),
        )
        
        markdown = await self._document_conversion_service.convert(file)
        chunks = await self._chunker_service.chunk(markdown, book=book, author=author)
        embedded_chunks = await self._embedding_service.embed(chunks)
        await self._store.add_chunks(embedded_chunks)

        logger.info(
            "Finished ingestion: book=%s chunks=%s elapsed_ms=%.2f",
            book,
            len(chunks),
            (time.perf_counter() - start) * 1000,
        )
