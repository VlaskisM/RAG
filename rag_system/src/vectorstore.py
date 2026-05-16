import asyncio
import logging
from typing import Dict, List, Tuple
from elasticsearch import AsyncElasticsearch
from elasticsearch.helpers import async_bulk
from abc import ABC, abstractmethod

from src.schemas import EmbeddedChunk, RetrievedChunk, ChunkMetadata


logger = logging.getLogger(__name__)


_SOURCE_FIELDS = [
    "chunk_id",
    "text",
    "book",
    "author",
    "block_type",
    "language",
    "part_title",
    "chapter_title",
    "section_title",
    "listing_number",
    "page",
]


class ElasticsearchVectorStoreInterface(ABC):

    @abstractmethod
    async def ensure_index(self) -> None:
        pass

    @abstractmethod
    async def add_chunks(self, chunks: List[EmbeddedChunk]) -> None:
        pass

    @abstractmethod
    async def search(
        self,
        query_text: str,
        query_vector: List[float],
        k: int,
        dense_k: int = 40,
        sparse_k: int = 40,
        num_candidates: int = 300,
        dense_weight: float = 0.7,
    ) -> List[RetrievedChunk]:
        pass

    @abstractmethod
    async def list_documents(self) -> List[dict]:
        pass


class ElasticsearchVectorStore(ElasticsearchVectorStoreInterface):
    def __init__(self, es_url: str, index_name: str, embedding_dim: int):
        self._es = AsyncElasticsearch(es_url)
        self._index_name = index_name
        self._embedding_dim = embedding_dim

    async def ensure_index(self) -> None:
        if not await self._es.indices.exists(index=self._index_name):
            await self._es.indices.create(
                index=self._index_name,
                settings={
                    "analysis": {
                        "analyzer": {
                            "ru_text": {
                                "type": "russian",
                            },
                        },
                    },
                },
                mappings={
                    "properties": {
                        "chunk_id":       {"type": "keyword"},
                        "text":           {"type": "text", "analyzer": "ru_text"},
                        "embedding":      {
                            "type": "dense_vector",
                            "dims": self._embedding_dim,
                            "index": True,
                            "similarity": "cosine",
                        },
                        "book":           {"type": "keyword"},
                        "author":         {"type": "keyword"},
                        "block_type":     {"type": "keyword"},
                        "language":       {"type": "keyword"},
                        "part_title":     {"type": "text", "analyzer": "ru_text"},
                        "chapter_title":  {"type": "text", "analyzer": "ru_text"},
                        "section_title":  {"type": "text", "analyzer": "ru_text"},
                        "listing_number": {"type": "keyword"},
                        "page":           {"type": "integer"},
                    }
                },
            )
            logger.info("Created Elasticsearch index '%s'", self._index_name)

    async def add_chunks(self, chunks: List[EmbeddedChunk]) -> None:
        actions = [
            {
                "_op_type": "index",
                "_index": self._index_name,
                "_id": chunk.chunk_id,
                "_source": {
                    "chunk_id":  chunk.chunk_id,
                    "text":      chunk.text,
                    "embedding": chunk.embedding,
                    **chunk.metadata.model_dump(),
                },
            }
            for chunk in chunks
        ]
        if actions:
            _, errors = await async_bulk(self._es, actions, raise_on_error=False)
            if errors:
                raise RuntimeError(f"Elasticsearch bulk index failed for {len(errors)} document(s): {errors}")
            logger.info("Indexed %s chunks into '%s'", len(actions), self._index_name)

    async def list_documents(self) -> List[dict]:
        response = await self._es.search(
            index=self._index_name,
            size=0,
            aggs={
                "documents": {
                    "terms": {
                        "field": "book",
                        "size": 1000,
                        "order": {"_key": "asc"},
                    },
                    "aggs": {
                        "authors": {"terms": {"field": "author", "size": 1}},
                        "pages": {"max": {"field": "page"}},
                        "sample": {
                            "top_hits": {
                                "size": 1,
                                "_source": [
                                    "book",
                                    "author",
                                    "text",
                                    "page",
                                    "chapter_title",
                                    "section_title",
                                ],
                            }
                        },
                    },
                }
            },
        )

        buckets = response.get("aggregations", {}).get("documents", {}).get("buckets", [])
        documents: List[dict] = []

        for bucket in buckets:
            sample_hits = (
                bucket.get("sample", {})
                .get("hits", {})
                .get("hits", [])
            )
            sample = sample_hits[0].get("_source", {}) if sample_hits else {}
            author_buckets = bucket.get("authors", {}).get("buckets", [])
            author = author_buckets[0].get("key", "") if author_buckets else sample.get("author", "")
            max_page = bucket.get("pages", {}).get("value")

            documents.append(
                {
                    "id": bucket.get("key", ""),
                    "fileName": bucket.get("key", ""),
                    "title": bucket.get("key", ""),
                    "type": "pdf",
                    "category": sample.get("chapter_title") or "Knowledge",
                    "uploadedAt": None,
                    "pages": int(max_page) if max_page is not None else None,
                    "owner": author or "",
                    "summary": sample.get("section_title") or sample.get("text", "")[:180],
                    "chunks": bucket.get("doc_count", 0),
                }
            )

        return documents

    @staticmethod
    def _to_retrieved_chunk(hit: dict, score: float) -> RetrievedChunk:
        source = hit.get("_source", {})
        return RetrievedChunk(
            chunk_id=source.get("chunk_id", ""),
            text=source.get("text", ""),
            score=score,
            metadata=ChunkMetadata(
                book=source.get("book", ""),
                author=source.get("author"),
                part_title=source.get("part_title", ""),
                chapter_title=source.get("chapter_title", ""),
                section_title=source.get("section_title", ""),
                block_type=source.get("block_type", "text"),
                language=source.get("language"),
                listing_number=source.get("listing_number"),
                page=source.get("page"),
            ),
        )

    async def _search_dense(
        self,
        query_vector: List[float],
        dense_k: int,
        num_candidates: int,
    ) -> List[dict]:
        response = await self._es.search(
            index=self._index_name,
            knn={
                "field": "embedding",
                "query_vector": query_vector,
                "k": dense_k,
                "num_candidates": max(num_candidates, dense_k),
            },
            source=_SOURCE_FIELDS,
        )
        return response.get("hits", {}).get("hits", [])

    async def _search_sparse(self, query_text: str, sparse_k: int) -> List[dict]:
        response = await self._es.search(
            index=self._index_name,
            query={
                "multi_match": {
                    "query": query_text,
                    "fields": [
                        "text^3",
                        "chapter_title^2",
                        "section_title^2",
                        "book",
                        "author",
                    ],
                }
            },
            size=sparse_k,
            source=_SOURCE_FIELDS,
        )
        return response.get("hits", {}).get("hits", [])

    @staticmethod
    def _min_max_normalize(scores: Dict[str, float]) -> Dict[str, float]:
        if not scores:
            return {}
        values = scores.values()
        lo, hi = min(values), max(values)
        if hi - lo < 1e-9:
            return {cid: 1.0 for cid in scores}
        return {cid: (s - lo) / (hi - lo) for cid, s in scores.items()}

    def _weighted_fuse(
        self,
        dense_hits: List[dict],
        sparse_hits: List[dict],
        k: int,
        dense_weight: float,
    ) -> List[RetrievedChunk]:
        dense_raw: Dict[str, float] = {}
        for hit in dense_hits:
            cid = hit.get("_source", {}).get("chunk_id")
            if cid:
                dense_raw[cid] = hit.get("_score", 0.0)

        sparse_raw: Dict[str, float] = {}
        for hit in sparse_hits:
            cid = hit.get("_source", {}).get("chunk_id")
            if cid:
                sparse_raw[cid] = hit.get("_score", 0.0)

        dense_norm = self._min_max_normalize(dense_raw)
        sparse_norm = self._min_max_normalize(sparse_raw)

        sparse_weight = 1.0 - dense_weight
        all_ids = set(dense_norm) | set(sparse_norm)
        fused: Dict[str, float] = {
            cid: dense_weight * dense_norm.get(cid, 0.0)
                 + sparse_weight * sparse_norm.get(cid, 0.0)
            for cid in all_ids
        }

        best_hits: Dict[str, dict] = {}
        for hit in (*dense_hits, *sparse_hits):
            cid = hit.get("_source", {}).get("chunk_id")
            if cid and cid not in best_hits:
                best_hits[cid] = hit

        ranked: List[Tuple[str, float]] = sorted(
            fused.items(),
            key=lambda item: item[1],
            reverse=True,
        )[:k]

        return [
            self._to_retrieved_chunk(best_hits[chunk_id], score)
            for chunk_id, score in ranked
        ]

    async def search(
        self,
        query_text: str,
        query_vector: List[float],
        k: int,
        dense_k: int = 40,
        sparse_k: int = 40,
        num_candidates: int = 300,
        dense_weight: float = 0.7,
    ) -> List[RetrievedChunk]:
        dense_task = self._search_dense(
            query_vector=query_vector,
            dense_k=dense_k,
            num_candidates=num_candidates,
        )
        sparse_task = self._search_sparse(query_text=query_text, sparse_k=sparse_k)
        dense_hits, sparse_hits = await asyncio.gather(dense_task, sparse_task)

        return self._weighted_fuse(
            dense_hits=dense_hits,
            sparse_hits=sparse_hits,
            k=k,
            dense_weight=dense_weight,
        )
