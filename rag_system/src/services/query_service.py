from typing import List, Tuple
from src.chunker import split_text
from src.config import settings
from src.schemas import Chunk, RetrivedChunk, SourceDocument
from src.promts.prompt_ask import ask_prompt


class QueryService:
    def __init__(self, client, store):
        self._client = client
        self._store = store

    async def _embed(self, texts: List[str]) -> List[List[float]]:
        resp = await self._client.embeddings.create(
            input=texts,
            model=settings.embedding_model,
        )
        return [item.embedding for item in resp.data]

    async def ingest(self, documents: List[SourceDocument]) -> None:
        texts: List[str] = []
        meta: List[tuple[str, int, dict]] = []

        for doc in documents:
            parts = split_text(
                doc.text,
                settings.chunk_size,
                settings.chunk_overlap,
            )
            for idx, part in enumerate(parts):
                texts.append(part)
                meta.append((doc.doc_id, idx, doc.metadata))

        if not texts:
            return

        embeddings = await self._embed(texts)

        chunks: List[Chunk] = [
            Chunk(
                chunk_id=f"{doc_id}_chunk_{idx}",
                text=text,
                embedding=embedding,
                doc_id=doc_id,
                metadata=metadata,
            )
            for text, embedding, (doc_id, idx, metadata) in zip(texts, embeddings, meta)
        ]

        await self._store.add_chunks(chunks)

    async def ask(self, question: str) -> Tuple[str, List[RetrivedChunk]]:
        embedding = (await self._embed([question]))[0]
        chunks = await self._store.search(embedding, settings.top_k)

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
