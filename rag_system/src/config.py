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
    retrieval_k: int = 40
    dense_k: int = 40
    sparse_k: int = 40
    num_candidates: int = 300
    rrf_k: int = 60
    llm_model: str
    embedding_model: str
    batch_size: int
    enable_reranker: bool = True
    reranker_model: str = "BAAI/bge-reranker-v2-m3"
    reranker_batch_size: int = 16


    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent / ".env",
        extra="ignore",
    )

settings = Settings()