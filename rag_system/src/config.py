from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    
    openai_api_key: str
    openai_base_url: str
    es_url: str
    es_index: str
    embedding_dim: int
    chunk_size: int
    chunk_overlap: int
    top_k: int
    llm_model: str
    embedding_model: str

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent / ".env",
        extra="ignore",
    )

settings = Settings()