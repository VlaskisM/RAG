import re
import uuid
import asyncio
from abc import ABC, abstractmethod
from typing import List

from src.schemas import Block, BlockType, Chunk, ChunkMetadata
from src.config import settings


"""
ChunkerService разбивает Markdown-текст учебника на смысловые чанки для RAG-пайплайна.

Работает в четыре этапа:
1. Парсинг — делит markdown на блоки и определяет тип каждого.
2. Слияние — объединяет двойные заголовки глав/частей (pymupdf4llm бьёт их на два ## блока).
3. Чанкинг — накапливает текстовые блоки до порога max_tokens_chunk,
   склеивает текст + код, сбрасывает атомарные блоки (определение, таблица, примечание).
4. Обогащение — каждый чанк получает контекстный префикс [Часть → Глава → Раздел].

Форматы pymupdf4llm, которые распознаются:
  PART    — «## **ЧАСТЬ I**» (отдельная строка с номером части)
  CHAPTER — «## ГЛАВА 1»    (отдельная строка с номером главы)
  SECTION — любой другой ## заголовок; «Выводы», «Эпилог», «Приложение А.»
  NOISE   — колонтитулы вида «Глава 1. Название **33**» — пропускаются
  IMAGE   — «==> picture» описания — пропускаются
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
        blocks = self._merge_split_headings(blocks)
        return self._build_chunks(blocks, book, author)

    

    def _parse_blocks(self, markdown: str) -> List[Block]:
        raw_blocks = re.split(r'\n{2,}', markdown.strip())
        return [
            self._classify(raw.strip())
            for raw in raw_blocks
            if raw.strip()
        ]

    def _classify(self, text: str) -> Block:
        
        if re.match(r'^\*\*==>|^-----', text):
            return Block(type=BlockType.IMAGE, content=text)
        if re.match(r'!\[.*?\]\(.*?\)', text):
            return Block(type=BlockType.IMAGE, content=text)

       
        code_match = re.match(r'```(\w+)?\n([\s\S]*?)```', text, re.DOTALL)
        if code_match:
            return Block(
                type=BlockType.CODE,
                content=code_match.group(2).strip(),
                language=code_match.group(1),
            )

        # Таблицы markdown
        if re.match(r'\|.+\|', text):
            return Block(type=BlockType.TABLE, content=text)

        # Колонтитулы: «Глава 1. Название **33**» / «Часть I. ... **31**»
        if re.match(r'^(Глава|Часть|Предисловие|Введение|Эпилог)\s.+\*\*\d+\*\*\s*$', text):
            return Block(type=BlockType.IMAGE, content=text)

        # Часть (pymupdf4llm): «## **ЧАСТЬ I**» или «## ЧАСТЬ I»
        if re.match(r'^##\s+\*?\*?ЧАСТЬ\s+([IVXLCDM]+|\d+)\*?\*?\s*$', text, re.IGNORECASE):
            return Block(type=BlockType.PART, content=text)

        # Часть (plain-text): «Часть I. …» / «ЧАСТЬ II.»
        if re.match(r'^Часть\s+([IVXLCDM]+|\d+)[.\s]', text, re.IGNORECASE):
            return Block(type=BlockType.PART, content=text)

        # Глава (pymupdf4llm): «## ГЛАВА 1» (без bold, без точки)
        if re.match(r'^##\s+ГЛАВА\s+\d+\s*$', text, re.IGNORECASE):
            return Block(type=BlockType.CHAPTER, content=text)

        # Глава (markdown #): «# Заголовок»
        if re.match(r'^#\s', text):
            return Block(type=BlockType.CHAPTER, content=text)

        # Глава (plain-text): «Глава 4. …» / «Глава 4: …»
        if re.match(r'^Глава\s+\d+[.:\s]', text, re.IGNORECASE):
            return Block(type=BlockType.CHAPTER, content=text)

        # Раздел (## / ###)
        if re.match(r'^#{2,3}\s', text):
            return Block(type=BlockType.SECTION, content=text)

        # Раздел (характерные подзаголовки): «Выводы», «Эпилог», «Приложение А.»
        if re.match(r'^Выводы\s*$', text, re.IGNORECASE):
            return Block(type=BlockType.SECTION, content=text)
        if re.match(r'^Эпилог\s*$', text, re.IGNORECASE):
            return Block(type=BlockType.SECTION, content=text)
        if re.match(r'^Приложение\s+[А-ЯЁA-Z]\.', text, re.IGNORECASE):
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

        if re.match(r'^(Примечание|Note)[\s:.,\-]', text, re.IGNORECASE):
            return Block(type=BlockType.NOTE, content=text)

        return Block(type=BlockType.TEXT, content=text)

    # ── Слияние двойных заголовков ─────────────────────────────────────────

    def _merge_split_headings(self, blocks: List[Block]) -> List[Block]:
        """pymupdf4llm разбивает заголовки глав/частей на два блока:
          ## ГЛАВА 1            (CHAPTER)
          ## **Название главы** (SECTION)
        Объединяем их в один блок с человекочитаемым заголовком.
        """
        result: List[Block] = []
        i = 0
        while i < len(blocks):
            block = blocks[i]
            if block.type in (BlockType.CHAPTER, BlockType.PART) and i + 1 < len(blocks):
                next_b = blocks[i + 1]
                if next_b.type == BlockType.SECTION:
                    num = re.sub(r'^#+\s*\*?\*?|\*?\*?\s*$', '', block.content).strip()
                    title = re.sub(r'^#+\s*\*?\*?|\*?\*?\s*$', '', next_b.content).strip()
                    merged = f"{num}. {title}" if num and title else (num or title)
                    result.append(Block(type=block.type, content=merged))
                    i += 2
                    continue
                else:
                    # Нет следующего SECTION — нормализуем сами
                    cleaned = re.sub(r'^#+\s*\*?\*?|\*?\*?\s*$', '', block.content).strip()
                    result.append(Block(type=block.type, content=cleaned))
                    i += 1
                    continue
            result.append(block)
            i += 1
        return result



    def _build_chunks(
        self, blocks: List[Block], book: str, author: str | None
    ) -> List[Chunk]:
        chunks: List[Chunk] = []
        current_part = ""
        current_chapter = ""
        current_section = ""
        pending: List[Block] = []
        last_text_tail: str = "" 

        def flush() -> None:
            nonlocal last_text_tail
            if not pending:
                return
            block_type = pending[0].type
            language = next((b.language for b in pending if b.language), None)
            listing_number = next((b.listing_number for b in pending if b.listing_number), None)

            levels = [lvl for lvl in (current_part, current_chapter, current_section) if lvl]
            header = f"[{' → '.join(levels)}]\n\n" if levels else ""
            body = "\n\n".join(b.content for b in pending)

            # Overlap: для TEXT-чанков добавляем хвост предыдущего в начало
            overlap_chars = settings.chunk_overlap * 4
            if block_type == BlockType.TEXT and last_text_tail and overlap_chars > 0:
                text = header + last_text_tail + "\n\n" + body
            else:
                text = header + body

            # Сохраняем хвост текущего TEXT-чанка для следующего
            if block_type == BlockType.TEXT and overlap_chars > 0:
                last_text_tail = body[-overlap_chars:] if len(body) > overlap_chars else body
            else:
                last_text_tail = ""

            chunks.append(Chunk(
                chunk_id=str(uuid.uuid4()),
                text=text,
                metadata=ChunkMetadata(
                    book=book,
                    author=author,
                    part_title=current_part,
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

            if block.type == BlockType.PART:
                flush()
                last_text_tail = ""
                current_part = block.content
                current_chapter = ""
                current_section = ""
                continue

            if block.type == BlockType.CHAPTER:
                flush()
                last_text_tail = ""
                current_chapter = block.content
                current_section = ""
                continue

            if block.type == BlockType.SECTION:
                flush()
                last_text_tail = ""
                current_section = re.sub(r'^#+\s*\*?\*?|\*?\*?\s*$', '', block.content).strip()
                continue

            next_block = blocks[i + 1] if i + 1 < len(blocks) else None
            next_is_code = next_block and next_block.type in (BlockType.CODE, BlockType.EXAMPLE)

            # Атомарные блоки — каждый в отдельный чанк
            if block.type in (BlockType.DEFINITION, BlockType.NOTE, BlockType.TABLE):
                flush()
                pending.append(block)
                flush()
                continue

            # Код — всегда отдельный чанк (может идти после текста-«заголовка»)
            if block.type == BlockType.CODE:
                pending.append(block)
                flush()
                continue

            # Листинг перед кодом — держим вместе
            if block.type == BlockType.EXAMPLE and next_is_code:
                pending.append(block)
                continue

            # Текст/листинг перед кодом — flush предыдущего накопленного, начинаем пару
            if block.type in (BlockType.TEXT, BlockType.EXAMPLE) and next_is_code:
                flush()
                pending.append(block)
                continue

            # Текст — накапливаем до порога
            if block.type in (BlockType.TEXT, BlockType.EXAMPLE):
                pending.append(block)
                combined = "\n\n".join(b.content for b in pending)
                if self._token_estimate(combined) >= settings.max_tokens_chunk:
                    flush()
                continue

            flush()
            pending.append(block)
            flush()

        flush()
        return chunks

    
    def _token_estimate(self, text: str) -> int:
        return len(text) // 4

