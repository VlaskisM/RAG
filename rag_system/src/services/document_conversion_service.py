import asyncio
from abc import ABC, abstractmethod

import pymupdf
import pymupdf4llm
from fastapi import UploadFile


class DocumentConversionServiceInterface(ABC):

    @abstractmethod
    async def convert(self, file: UploadFile) -> str:
        pass


class DocumentConversionService(DocumentConversionServiceInterface):

    async def convert(self, file: UploadFile) -> str:
        contents = await file.read()
        return await asyncio.to_thread(self._parse_pdf, contents)

    def _parse_pdf(self, contents: bytes) -> str:
        doc = pymupdf.open(stream=contents, filetype="pdf")
        return pymupdf4llm.to_markdown(doc)
