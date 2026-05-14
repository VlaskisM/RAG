from pydantic import BaseModel, Field

from src.schemas import BlockType


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Вопрос к RAG-системе")


class SourceItem(BaseModel):
    text: str
    score: float
    part: str = ""
    chapter: str = ""
    section: str = ""
    block_type: BlockType


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceItem]


class IngestResponse(BaseModel):
    message: str
