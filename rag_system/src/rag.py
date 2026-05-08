from typing import List, Tuple
from src.chunker import split_text
from src.config import settings
from src.schemas import Chunk, RetrivedChunk, SourceDocument
from src.promts.prompt_ask import ask_prompt


class RAGService:
    def __init__(self, client, store):
        self._client = client
        self._store = store
        
    
    def _embed(self, texts: List[str]) -> List[List[float]]:
        resp = self._client.embeddings.create(
            input=texts,
            model=settings.embedding_model
        )
        return [item.embedding for item in resp.data]

    def ingest(self, documents: List[SourceDocument]) -> None:

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

        embeddings = self._embed(texts)

        chunks: List[Chunk] = []
        for text, embedding, (doc_id, idx, metadata) in zip(texts, embeddings, meta):
            chunks.append(Chunk(
                chunk_id=f"{doc_id}_chunk_{idx}",
                text=text,
                embedding=embedding,
                doc_id=doc_id,
                metadata=metadata,
            ))

        self._store.add_chunks(chunks)

    def ask(self, question: str) -> Tuple[str, List[RetrivedChunk]]:
        embedding = self._embed([question])[0]
        chunks = self._store.search(embedding, settings.top_k)

        context = "\n\n".join(f"[{i+1}] {c.text}" for i, c in enumerate(chunks))

        prompt = ask_prompt(context)
        user_prompt = f"Вопрос пользователя: {question}"

        chat = self._client.chat.completions.create(
            model=settings.llm_model,
            temperature=0,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        answer = chat.choices[0].message.content or "Я не знаю."
        return answer, chunks