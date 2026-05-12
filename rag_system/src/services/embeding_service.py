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

    async def embed(self, chunks: List[Chunk]) -> List[EmbeddedChunk]:
        batches = [chunks[i:i + settings.batch_size] for i in range(0, len(chunks), settings.batch_size)]
        results = await asyncio.gather(*[self._embed_batch(batch) for batch in batches])
        return [chunk for batch in results for chunk in batch]

    async def _embed_batch(self, chunks: List[Chunk]) -> List[EmbeddedChunk]:
        response = await self._client.embeddings.create(
            model=settings.embedding_model,
            input=[chunk.text for chunk in chunks],
        )

        return [
            EmbeddedChunk(
                chunk_id=chunk.chunk_id,
                text=chunk.text,
                embedding=data.embedding,
                metadata=chunk.metadata,
            )
            for chunk, data in zip(chunks, response.data)
        ]