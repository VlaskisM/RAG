from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    
    openai_api_key: str
    openai_base_url: str
    es_url: str
    es_index: str
    embedding_dim: int
    max_tokens_chunk: int
    chunk_overlap: int
    top_k: int
    retrieval_k: int
    dense_k: int
    sparse_k: int
    num_candidates: int
    rrf_k: int
    llm_model: str
    embedding_model: str
    batch_size: int
    enable_reranker: bool
    reranker_model: str
    reranker_batch_size: int
    database_url: str = "postgresql+asyncpg://rag:rag@localhost:5433/rag_app"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent / ".env",
        extra="ignore",
    )

settings = Settings()
