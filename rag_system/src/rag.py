from typing import List, Tuple
from src.chunker import split_text
from src.config import settings
from src.schemas import Chunk, RetrivedChunk, SourceDocument
from src.promts.promt_ask import ask_prompt


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
        meta = []

        for doc in documents:
            parts = split_text(
                doc.text,
                settings.chunk_size,
                settings.chunk_overlap,
            )
            for part in parts:
                texts.append(part.text)
                meta.append((doc.doc_id, doc.metadata))

        if not texts:
            return

        embeddings = self._embed(texts)

        chunks: List[Chunk] = []
        for text, embedding, doc_id, metadata in zip(texts, embeddings, meta):
            chunks.append(Chunk(
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

        chat = self.client.chat.completions.create(
            model=settings.llm_model,
            temperature=0,
            messages=[
                {"role": "system", "content": prompt}
            ],
        )

        answer = chat.choices[0].message.content or "Я не знаю."
        return answer, chunks