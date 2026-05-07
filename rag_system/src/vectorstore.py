from typing import List
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
from abc import ABC, abstractmethod
 
from src.schemas import Chunk, RetrivedChunk


class ElasticsearchVectorStoreInterface(ABC):

    @abstractmethod
    def ensure_index(self) -> None:
        pass

    @abstractmethod
    def add_chunks(self, chunks: List[Chunk]) -> None:
        pass

    @abstractmethod
    def search(self, query_vector: List[float], k: int) -> List[RetrivedChunk]:
        pass

class ElasticsearchVectorStore(ElasticsearchVectorStoreInterface):
    def __init__(self, es_url: str, index_name: str, embedding_dim: int):
        self._es = Elasticsearch(es_url)
        self._index_name = index_name
        self._embedding_dim = embedding_dim

    def ensure_index(self) -> None:
        if not self._es.indices.exists(index=self._index_name):

            body = {
                "mappings": {
                    "properties": {
                        "doc_id": {"type": "keyword"},
                        "chunk_id": {"type": "keyword"},
                        "text": {"type": "text"},
                        "metadata": {"type": "object", "enabled": True},
                        "embedding": {
                            "type": "dense_vector",
                            "dims": self.embedding_dim,
                            "index": True,
                            "similarity": "cosine",
                        },
                    }
                }
            }
            self._es.indices.create(index=self._index_name, body=body)

    def add_chunks(self, chunks: List[Chunk]) -> None:
        actions = []
        for chunk in chunks:
            actions.append({
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
            })
        bulk(self._es, actions)

    