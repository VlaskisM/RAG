import asyncio
import logging
import time
from abc import ABC, abstractmethod
from typing import List
from sentence_transformers import CrossEncoder
from src.schemas import RetrievedChunk


logger = logging.getLogger(__name__)


class RerankerServiceInterface(ABC):
    @abstractmethod
    async def rerank(self, query: str, chunks: List[RetrievedChunk]) -> List[RetrievedChunk]:
        pass


class RerankerService(RerankerServiceInterface):
    def __init__(self, model_name: str, batch_size: int = 16):
        self._model = CrossEncoder(model_name)
        self._batch_size = batch_size

    async def rerank(self, query: str, chunks: List[RetrievedChunk]) -> List[RetrievedChunk]:
        if not chunks:
            return chunks
        return await asyncio.to_thread(self._rerank_sync, query, chunks)

    def _rerank_sync(self, query: str, chunks: List[RetrievedChunk]) -> List[RetrievedChunk]:
        pairs = [[query, chunk.text] for chunk in chunks]
        start = time.perf_counter()
        scores = self._model.predict(
            pairs,
            batch_size=self._batch_size,
            convert_to_numpy=True,
            show_progress_bar=False,
        )
        logger.debug(
            "Reranker predict finished: chunks=%s batch_size=%s elapsed_ms=%.2f",
            len(chunks),
            self._batch_size,
            (time.perf_counter() - start) * 1000,
        )

        for chunk, score in zip(chunks, scores):
            chunk.score = float(score)

        return sorted(chunks, key=lambda item: item.score, reverse=True)
