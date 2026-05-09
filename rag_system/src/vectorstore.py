from typing import List
from elasticsearch import AsyncElasticsearch
from elasticsearch.helpers import async_bulk
from abc import ABC, abstractmethod

from src.schemas import Chunk, RetrivedChunk


class ElasticsearchVectorStoreInterface(ABC):

    @abstractmethod
    async def ensure_index(self) -> None:
        pass

    @abstractmethod
    async def add_chunks(self, chunks: List[Chunk]) -> None:
        pass

    @abstractmethod
    async def search(self, query_vector: List[float], k: int) -> List[RetrivedChunk]:
        pass


class ElasticsearchVectorStore(ElasticsearchVectorStoreInterface):
    def __init__(self, es_url: str, index_name: str, embedding_dim: int):
        self._es = AsyncElasticsearch(es_url)
        self._index_name = index_name
        self._embedding_dim = embedding_dim

    async def ensure_index(self) -> None:
        if not await self._es.indices.exists(index=self._index_name):
            body = {
                "mappings": {
                    "properties": {
                        "doc_id": {"type": "keyword"},
                        "chunk_id": {"type": "keyword"},
                        "text": {"type": "text"},
                        "metadata": {"type": "object", "enabled": True},
                        "embedding": {
                            "type": "dense_vector",
                            "dims": self._embedding_dim,
                            "index": True,
                            "similarity": "cosine",
                        },
                    }
                }
            }
            await self._es.indices.create(index=self._index_name, body=body)

    async def add_chunks(self, chunks: List[Chunk]) -> None:
        actions = [
            {
                "_op_type": "index",
                "_index": self._index_name,
                "_id": chunk.chunk_id,
                "_source": {
                    "doc_id": chunk.doc_id,
                    "chunk_id": chunk.chunk_id,
                    "text": chunk.text,
                    "metadata": chunk.metadata,
                    "embedding": chunk.embedding,
                },
            }
            for chunk in chunks
        ]
        if actions:
            await async_bulk(self._es, actions)

    async def search(self, query_vector: List[float], k: int) -> List[RetrivedChunk]:
        body = {
            "knn": {
                "field": "embedding",
                "query_vector": query_vector,
                "k": k,
                "num_candidates": max(k * 10, 30),
            },
            "_source": ["doc_id", "chunk_id", "text", "metadata"],
        }
        response = await self._es.search(index=self._index_name, body=body)
        hits = response.get("hits", {}).get("hits", [])

        return [
            RetrivedChunk(
                chunk_id=hit["_source"].get("chunk_id", ""),
                doc_id=hit["_source"].get("doc_id", ""),
                text=hit["_source"].get("text", ""),
                score=float(hit.get("_score", 0.0)),
                metadata=hit["_source"].get("metadata", {}),
            )
            for hit in hits
        ]
