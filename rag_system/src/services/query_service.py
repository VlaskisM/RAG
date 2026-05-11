import uuid
from typing import List, Tuple

from src.config import settings
from src.schemas import BlockType, Chunk, ChunkMetadata, RetrievedChunk
from src.services.embeding_service import EmbeddingServiceInterface
from src.services.chunker_service import ChunkerServiceInterface
from src.promts.prompt_ask import ask_prompt


class QueryService:
    def __init__(
        self,
        client,
        store,
        embedding_service: EmbeddingServiceInterface,
        chunker_service: ChunkerServiceInterface,
    ):
        self._client = client
        self._store = store
        self._embedding_service = embedding_service

    async def ask(self, question: str) -> Tuple[str, List[RetrievedChunk]]:
        query_chunk = Chunk(
            chunk_id=str(uuid.uuid4()),
            text=question,
            metadata=ChunkMetadata(book="", block_type=BlockType.TEXT),
        )
        embedded = await self._embedding_service.embed([query_chunk])
        chunks = await self._store.search(embedded[0].embedding, settings.top_k)

        context = "\n\n".join(f"[{i+1}] {c.text}" for i, c in enumerate(chunks))

        chat = await self._client.chat.completions.create(
            model=settings.llm_model,
            temperature=0,
            messages=[
                {"role": "system", "content": ask_prompt(context)},
                {"role": "user", "content": f"Вопрос пользователя: {question}"},
            ],
        )

        answer = chat.choices[0].message.content or "Я не знаю."
        return answer, chunks
