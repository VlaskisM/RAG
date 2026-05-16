import logging
import time
from typing import List, Optional, Tuple

from src.config import settings
from src.schemas import RetrievedChunk
from src.services.embeding_service import EmbeddingServiceInterface
from src.services.llm_service import LLMServiceInterface
from src.services.reranker_service import RerankerServiceInterface
from src.promts.prompt_ask import ask_prompt


logger = logging.getLogger(__name__)


NO_CONTEXT_MARKERS = (
    "информация отсутствует",
    "В предоставленных фрагментах книги эта информация отсутствует.",
    "в предоставленных фрагментах книги эта информация отсутствует",
    "в предоставленных фрагментах эта информация отсутствует",
    "в контексте нет",
    "не найдено",
    "не нашёл",
    "не нашел",
)


def _answer_has_no_context(answer: str) -> bool:
    normalized = answer.lower().replace("ё", "е")
    return any(marker.replace("ё", "е") in normalized for marker in NO_CONTEXT_MARKERS)


class QueryService:
    def __init__(
        self,
        store,
        embedding_service: EmbeddingServiceInterface,
        llm_service: LLMServiceInterface,
        reranker_service: Optional[RerankerServiceInterface] = None,
    ):
        self._store = store
        self._embedding_service = embedding_service
        self._llm_service = llm_service
        self._reranker_service = reranker_service

    async def ask(self, question: str) -> Tuple[str, List[RetrievedChunk]]:
        total_start = time.perf_counter()
        embed_ms = search_ms = rerank_ms = llm_ms = 0.0
        retrieved_count = 0
        reranked_count = 0

        stage_start = time.perf_counter()
        query_vector = await self._embedding_service.embed_query(question)
        embed_ms = (time.perf_counter() - stage_start) * 1000

        stage_start = time.perf_counter()
        chunks = await self._store.search(
            query_text=question,
            query_vector=query_vector,
            k=settings.retrieval_k,
            dense_k=settings.dense_k,
            sparse_k=settings.sparse_k,
            num_candidates=settings.num_candidates,
            dense_weight=settings.hybrid_dense_weight,
        )
        search_ms = (time.perf_counter() - stage_start) * 1000
        retrieved_count = len(chunks)

        if self._reranker_service is not None:
            stage_start = time.perf_counter()
            chunks = await self._reranker_service.rerank(question, chunks)
            rerank_ms = (time.perf_counter() - stage_start) * 1000
        reranked_count = len(chunks)

        final_chunks = chunks[:settings.top_k]

        context = "\n\n".join(f"[{i+1}] {c.text}" for i, c in enumerate(final_chunks))

        stage_start = time.perf_counter()
        answer = await self._llm_service.answer(
            prompt=ask_prompt(context),
            question=question,
        )
        llm_ms = (time.perf_counter() - stage_start) * 1000

        if _answer_has_no_context(answer):
            final_chunks = []

        total_ms = (time.perf_counter() - total_start) * 1000
        logger.info(
            "Query processed: embed_ms=%.2f search_ms=%.2f rerank_ms=%.2f "
            "llm_ms=%.2f total_ms=%.2f retrieved=%s reranked=%s final=%s",
            embed_ms,
            search_ms,
            rerank_ms,
            llm_ms,
            total_ms,
            retrieved_count,
            reranked_count,
            len(final_chunks),
        )
        return answer, final_chunks
