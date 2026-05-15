from contextlib import asynccontextmanager
import logging

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
from src.services.document_conversion_service import DocumentConversionService
from src.services.llm_service import LLMService
from src.services.reranker_service import RerankerService


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    
    logger.info("Starting RAG System")

    client = AsyncOpenAI(
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url
    )

    store = ElasticsearchVectorStore(
        es_url=settings.es_url,
        index_name=settings.es_index,
        embedding_dim=settings.embedding_dim
    )
    await store.ensure_index()

    embedding_service = EmbeddingService(client=client)
    llm_service = LLMService(client=client)

    reranker_service = (
        RerankerService(
            model_name=settings.reranker_model,
            batch_size=settings.reranker_batch_size,
        )
        if settings.enable_reranker
        else None
    )
    logger.info("Reranker enabled: %s", reranker_service is not None)

    app.state.query_service = QueryService(
        store=store,
        embedding_service=embedding_service,
        llm_service=llm_service,
        reranker_service=reranker_service,
    )

    app.state.data_loading_service = DataLoadingService(
        store=store,
        embedding_service=embedding_service,
        chunker_service=ChunkerService(),
        document_conversion_service=DocumentConversionService()
    )

    try:
        yield
    finally:
        logger.info("Shutting down RAG System")


app = FastAPI(title="RAG System", lifespan=lifespan)
app.include_router(queries_router)
app.include_router(data_loading_router)

