from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from src.schemas import BlockType


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=1, description="Вопрос к RAG-системе")


class SourceItem(BaseModel):
    fileName: str = ""
    text: str
    score: float
    page: Optional[int] = None
    book: str = ""
    author: Optional[str] = None
    part: str = ""
    chapter: str = ""
    section: str = ""
    block_type: BlockType


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceItem]


class IngestResponse(BaseModel):
    message: str
    book: str
    chunks: int


class UserSettingsResponse(BaseModel):
    theme: str
    language: str
    show_relevance: bool
    save_history: bool


class UserProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    department: str
    avatar_url: Optional[str] = None
    settings: UserSettingsResponse


class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=160)
    role: Optional[str] = Field(default=None, min_length=1, max_length=160)
    department: Optional[str] = Field(default=None, min_length=1, max_length=160)
    avatar_url: Optional[str] = Field(default=None, max_length=512)


class UserSettingsUpdate(BaseModel):
    theme: Optional[str] = Field(default=None, pattern="^(light|dark|system)$")
    language: Optional[str] = Field(default=None, min_length=2, max_length=16)
    show_relevance: Optional[bool] = None
    save_history: Optional[bool] = None


class QueryHistoryItemResponse(BaseModel):
    id: int
    question: str
    answer: str
    source_count: int
    created_at: str


class DocumentItemResponse(BaseModel):
    id: str
    fileName: str
    title: str
    type: str = "pdf"
    category: str = "Knowledge"
    uploadedAt: Optional[str] = None
    pages: Optional[int] = None
    owner: str = ""
    summary: str = ""


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    role: Optional[str] = Field(default=None, max_length=160)
    department: Optional[str] = Field(default=None, max_length=160)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


class AuthResponse(BaseModel):
    token: str
    profile: UserProfileResponse


class StatsResponse(BaseModel):
    documents: int
    queries: int
    sources_total: int
    chats: int


class ChatSummaryResponse(BaseModel):
    id: int
    title: str
    created_at: str
    updated_at: str
    message_count: int


class ChatCreateRequest(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)


class ChatMessageSource(BaseModel):
    fileName: str = ""
    text: str
    score: float
    page: Optional[int] = None
    book: str = ""
    author: Optional[str] = None
    part: str = ""
    chapter: str = ""
    section: str = ""
    block_type: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: str
    sources: list[ChatMessageSource] = []


class ChatMessagesResponse(BaseModel):
    chat: ChatSummaryResponse
    messages: list[ChatMessageResponse]


class ChatAskResponse(BaseModel):
    chat: ChatSummaryResponse
    user_message: ChatMessageResponse
    assistant_message: ChatMessageResponse


class CodeReviewRequest(BaseModel):
    code: str = Field(..., min_length=1, description="Исходный код для ревью")
    filename: str = Field(default="", description="Имя файла")
    question: str = Field(default="", description="Дополнительный вопрос от разработчика")


class CodeReviewResponse(BaseModel):
    review: str
