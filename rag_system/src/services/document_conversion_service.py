import io
import asyncio
from abc import ABC, abstractmethod
from fastapi import UploadFile
from marker.converters.pdf import PdfConverter
from marker.models import create_model_dict
from marker.output import text_from_rendered


class DocumentConversionServiceInterface(ABC):

    @abstractmethod
    async def convert(self, file: UploadFile) -> str:
        pass


class DocumentConversionService(DocumentConversionServiceInterface):
    def __init__(self):
        self._models = create_model_dict()

    async def convert(self, file: UploadFile) -> str:
        contents = await file.read()
        return await asyncio.to_thread(self._parse_pdf, contents)

    def _parse_pdf(self, contents: bytes) -> str:
        converter = PdfConverter(artifact_dict=self._models)
        rendered = converter(io.BytesIO(contents))
        markdown, _, _ = text_from_rendered(rendered)
        return markdown
