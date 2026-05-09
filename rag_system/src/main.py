from contextlib import asynccontextmanager
from dataclasses import dataclass
from openai import AsyncOpenAI
from src.vectorstore import ElasticsearchVectorStore
from src.config import settings
from fastapi import FastAPI
from src.routes.queries import router as queries_router
from src.routes.data_loading import router as data_loading_router
from src.services.query_service import QueryService
from src.services.data_loading_service import DataLoadingService
from src.services.embeding_service import EmbeddingService
from src.services.chunker_service import ChunkerService



@asynccontextmanager
async def lifespan(app: FastAPI):
    client = AsyncOpenAI(
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url,
        timeout=10
    )

    store = ElasticsearchVectorStore(
        es_url=settings.es_url,
        index_name=settings.es_index,
        embedding_dim=settings.embedding_dim
    )
    await store.ensure_index()

    app.state.query_service = QueryService(
        client=client,
        store=store,
        embedding_service=EmbeddingService(client=client),
        chunker_service=ChunkerService()
    )

    app.state.data_loading_service = DataLoadingService(
        client=client,
        store=store,
        embedding_service=EmbeddingService(client=client),
        chunker_service=ChunkerService()
    )
    yield


app = FastAPI(title="RAG System", lifespan=lifespan)
app.include_router(queries_router)
app.include_router(data_loading_router)

