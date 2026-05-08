from openai import OpenAI
from src.vectorstore import ElasticsearchVectorStore
from src.documents import load_documents
from src.rag import RAGService
from src.config import settings


def main():

    client = OpenAI(
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url,
        timeout=10,
    )

    store = ElasticsearchVectorStore(
        es_url=settings.es_url,
        index_name=settings.es_index,
        embedding_dim=settings.embedding_dim,
    )

    rag = RAGService(client, store)

    documents = load_documents()
    rag.ingest(documents)

    while True:
        question = input("Enter a query: ")
        if question.lower() == "exit":
            break

        answer, chunks = rag.ask(question)
        print(answer)
        print(chunks)