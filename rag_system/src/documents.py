from typing import List
from src.schemas import SourceDocument


def load_documents() -> List[SourceDocument]:
    return [
        SourceDocument(
            doc_id="doc_1",
            text="RAG означает Retrieval-Augmented Generation. Это подход, где LLM отвечает, опираясь на найденные документы.",
            metadata={"source": "intro"},
        ),
        SourceDocument(
            doc_id="doc_2",
            text="Elasticsearch поддерживает dense_vector и kNN-поиск, поэтому его можно использовать как векторное хранилище.",
            metadata={"source": "elasticsearch"},
        ),
        SourceDocument(
            doc_id="doc_3",
            text="FAISS — это библиотека для быстрого поиска ближайших векторов, часто используется для локальных прототипов.",
            metadata={"source": "faiss"},
        ),
    ]