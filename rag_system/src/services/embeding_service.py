import asyncio
from abc import ABC, abstractmethod
from typing import List

from src.schemas import Chunk, EmbeddedChunk
from src.config import settings


class EmbeddingServiceInterface(ABC):

    @abstractmethod
    async def embed(self, chunks: List[Chunk]) -> List[EmbeddedChunk]:
        pass


class EmbeddingService(EmbeddingServiceInterface):

    def __init__(self, client):
        self._client = client
        self._semaphore = asyncio.Semaphore(settings.embedding_concurrency)

    async def embed(self, chunks: List[Chunk]) -> List[EmbeddedChunk]:
        return await asyncio.gather(*[self._embed_one(chunk) for chunk in chunks])

    async def _embed_one(self, chunk: Chunk) -> EmbeddedChunk:
        async with self._semaphore:
            response = await self._client.embeddings.create(
                model=settings.embedding_model,
                input=[chunk.text],
                encoding_format="float",
            )
        return EmbeddedChunk(
            chunk_id=chunk.chunk_id,
            text=chunk.text,
            embedding=response.data[0].embedding,
            metadata=chunk.metadata,
        )