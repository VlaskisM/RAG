from typing import Dict, Any, List
from pydantic import BaseModel, Field


class SourceDocument(BaseModel):
    doc_id: str
    text: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

class Chunk(BaseModel):
    chunk_id: str
    doc_id: str
    text: str
    embedding: List[float]
    metadata: Dict[str, Any] = Field(default_factory=dict)

class RetrivedChunk(BaseModel):
    chunk_id: str
    doc_id: str
    text: str
    score: float
    metadata: Dict[str, Any] = Field(default_factory=dict)