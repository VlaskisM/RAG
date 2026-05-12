from typing import List
from elasticsearch import AsyncElasticsearch
from elasticsearch.helpers import async_bulk
from abc import ABC, abstractmethod

from src.schemas import EmbeddedChunk, RetrievedChunk, ChunkMetadata


class ElasticsearchVectorStoreInterface(ABC):

    @abstractmethod
    async def ensure_index(self) -> None:
        pass

    @abstractmethod
    async def add_chunks(self, chunks: List[EmbeddedChunk]) -> None:
        pass

    @abstractmethod
    async def search(self, query_vector: List[float], k: int) -> List[RetrievedChunk]:
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
                mappings={
                    "properties": {
                        "chunk_id":       {"type": "keyword"},
                        "text":           {"type": "text"},
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
                        "part_title":     {"type": "text"},
                        "chapter_title":  {"type": "text"},
                        "section_title":  {"type": "text"},
                        "listing_number": {"type": "keyword"},
                        "page":           {"type": "integer"},
                    }
                },
            )

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

    async def search(self, query_vector: List[float], k: int) -> List[RetrievedChunk]:
        response = await self._es.search(
            index=self._index_name,
            knn={
                "field": "embedding",
                "query_vector": query_vector,
                "k": k,
                "num_candidates": max(k * 10, 30),
            },
            source=[
                "chunk_id", "text", "book", "author", "block_type", "language",
                "chapter_title", "section_title", "listing_number", "page",
            ],
        )
        hits = response.get("hits", {}).get("hits", [])

        return [
            RetrievedChunk(
                chunk_id=hit["_source"].get("chunk_id", ""),
                text=hit["_source"].get("text", ""),
                score=float(hit.get("_score", 0.0)),
                metadata=ChunkMetadata(
                    book=hit["_source"].get("book", ""),
                    author=hit["_source"].get("author"),
                    chapter_title=hit["_source"].get("chapter_title", ""),
                    section_title=hit["_source"].get("section_title", ""),
                    block_type=hit["_source"].get("block_type", "text"),
                    language=hit["_source"].get("language"),
                    listing_number=hit["_source"].get("listing_number"),
                    page=hit["_source"].get("page"),
                ),
            )
            for hit in hits
        ]