import re
import uuid
import asyncio
from abc import ABC, abstractmethod
from typing import List

from src.schemas import Block, BlockType, Chunk, ChunkMetadata
from src.config import settings


"""
ChunkerService разбивает Markdown-текст учебника на смысловые чанки для RAG-пайплайна.

Работает в три этапа:
1. Парсинг — делит markdown на блоки и определяет тип каждого
   (глава, раздел, код, таблица, определение, пример, примечание, изображение, текст).
2. Чанкинг — склеивает логически связанные блоки (текст + код идут вместе),
   пропускает изображения, разбивает длинные тексты по абзацам.
3. Обогащение метаданными — каждый чанк получает контекстный заголовок
   [Глава → Раздел] и метаданные: книга, автор, тип блока, язык кода, номер листинга.

Порог длинного текста задаётся через settings.max_tokens_chunk.
"""

class ChunkerServiceInterface(ABC):

    @abstractmethod
    async def chunk(self, markdown: str, book: str, author: str | None = None) -> List[Chunk]:
        pass

class ChunkerService(ChunkerServiceInterface):

    async def chunk(self, markdown: str, book: str, author: str | None = None) -> List[Chunk]:
        return await asyncio.to_thread(self._chunk_sync, markdown, book, author)

    def _chunk_sync(self, markdown: str, book: str, author: str | None) -> List[Chunk]:
        blocks = self._parse_blocks(markdown)
        return self._build_chunks(blocks, book, author)

   

    def _parse_blocks(self, markdown: str) -> List[Block]:
        raw_blocks = re.split(r'\n{2,}', markdown.strip())
        return [
            self._classify(raw.strip())
            for raw in raw_blocks
            if raw.strip()
        ]

    def _classify(self, text: str) -> Block:
        if re.match(r'!\[.*?\]\(.*?\)', text):
            return Block(type=BlockType.IMAGE, content=text)

        code_match = re.match(r'```(\w+)?\n([\s\S]*?)```', text, re.DOTALL)
        if code_match:
            return Block(
                type=BlockType.CODE,
                content=code_match.group(2).strip(),
                language=code_match.group(1),
            )

        if re.match(r'\|.+\|', text):
            return Block(type=BlockType.TABLE, content=text)

        if re.match(r'^#\s', text):
            return Block(type=BlockType.CHAPTER, content=text)

        if re.match(r'^#{2,3}\s', text):
            return Block(type=BlockType.SECTION, content=text)

        if re.match(r'^(Определение|Definition)[:\s]', text, re.IGNORECASE):
            return Block(type=BlockType.DEFINITION, content=text)

        example_match = re.match(
            r'^(Листинг|Пример|Example|Listing)\s+(\d+\.\d+)', text, re.IGNORECASE
        )
        if example_match:
            return Block(
                type=BlockType.EXAMPLE,
                content=text,
                listing_number=example_match.group(2),
            )

        if re.match(r'^(Примечание|Note|⚠️)', text, re.IGNORECASE):
            return Block(type=BlockType.NOTE, content=text)

        return Block(type=BlockType.TEXT, content=text)

    

    def _build_chunks(
        self, blocks: List[Block], book: str, author: str | None
    ) -> List[Chunk]:
        chunks: List[Chunk] = []
        current_chapter = ""
        current_section = ""
        pending: List[Block] = []

        def flush() -> None:
            if not pending:
                return

            block_type = pending[0].type
            language = next((b.language for b in pending if b.language), None)
            listing_number = next((b.listing_number for b in pending if b.listing_number), None)

            if current_section:
                header = f"[{current_chapter} → {current_section}]\n\n"
            elif current_chapter:
                header = f"[{current_chapter}]\n\n"
            else:
                header = ""

            text = header + "\n\n".join(b.content for b in pending)

            chunks.append(Chunk(
                chunk_id=str(uuid.uuid4()),
                text=text,
                metadata=ChunkMetadata(
                    book=book,
                    author=author,
                    chapter_title=current_chapter,
                    section_title=current_section,
                    block_type=block_type,
                    language=language,
                    listing_number=listing_number,
                ),
            ))
            pending.clear()

        for i, block in enumerate(blocks):
            if block.type == BlockType.IMAGE:
                continue

            if block.type == BlockType.CHAPTER:
                flush()
                current_chapter = re.sub(r'^#+\s*', '', block.content)
                current_section = ""
                continue

            if block.type == BlockType.SECTION:
                flush()
                current_section = re.sub(r'^#+\s*', '', block.content)
                continue

            next_block = blocks[i + 1] if i + 1 < len(blocks) else None
            next_is_code = next_block and next_block.type in (BlockType.CODE, BlockType.EXAMPLE)

            if block.type in (BlockType.DEFINITION, BlockType.NOTE, BlockType.TABLE):
                flush()
                pending.append(block)
                flush()
                continue

            if block.type == BlockType.CODE:
                pending.append(block)
                flush()
                continue

            
            if block.type == BlockType.EXAMPLE and next_is_code:
                pending.append(block)
                continue

            if block.type in (BlockType.TEXT, BlockType.EXAMPLE) and next_is_code:
                flush()
                pending.append(block)
                continue

            if block.type == BlockType.TEXT and self._token_estimate(block.content) > settings.max_tokens_chunk:
                flush()
                for para in self._split_paragraphs(block.content):
                    pending.append(Block(type=BlockType.TEXT, content=para))
                    flush()
                continue

            flush()
            pending.append(block)
            flush()

        flush()
        return chunks

    def _token_estimate(self, text: str) -> int:
        return len(text) // 4

    def _split_paragraphs(self, text: str) -> List[str]:
        paras = [p.strip() for p in re.split(r'\n{2,}', text) if p.strip()]
        if settings.chunk_overlap == 0 or len(paras) <= 1:
            return paras
        overlap_chars = settings.chunk_overlap * 4
        result = [paras[0]]
        for i in range(1, len(paras)):
            prev = paras[i - 1]
            tail = prev[-overlap_chars:] if len(prev) > overlap_chars else prev
            result.append(tail + "\n\n" + paras[i])
        return result
