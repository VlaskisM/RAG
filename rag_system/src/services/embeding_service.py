import asyncio
from abc import ABC, abstractmethod
from typing import List

from src.schemas import Chunk, EmbeddedChunk
from src.config import settings


class EmbeddingServiceInterface(ABC):

    @abstractmethod
    async def embed_documents(self, chunks: List[Chunk]) -> List[EmbeddedChunk]:
        pass

    @abstractmethod
    async def embed_query(self, text: str) -> List[float]:
        pass


class EmbeddingService(EmbeddingServiceInterface):

    def __init__(self, client):
        self._client = client
        self._semaphore = asyncio.Semaphore(settings.embedding_concurrency)

    async def embed_documents(self, chunks: List[Chunk]) -> List[EmbeddedChunk]:
        return await asyncio.gather(*[self._embed_one_doc(chunk) for chunk in chunks])

    async def _embed_one_doc(self, chunk: Chunk) -> EmbeddedChunk:
        async with self._semaphore:
            response = await self._client.embeddings.create(
                model=settings.embedding_model_doc,
                input=[chunk.text],
                encoding_format="float",
            )
        return EmbeddedChunk(
            chunk_id=chunk.chunk_id,
            text=chunk.text,
            embedding=response.data[0].embedding,
            metadata=chunk.metadata,
        )

    async def embed_query(self, text: str) -> List[float]:
        response = await self._client.embeddings.create(
            model=settings.embedding_model_query,
            input=[text],
            encoding_format="float",
        )
        return response.data[0].embedding
