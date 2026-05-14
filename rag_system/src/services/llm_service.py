from abc import ABC, abstractmethod

from src.config import settings


class LLMServiceInterface(ABC):

    @abstractmethod
    async def answer(self, prompt: str, question: str) -> str:
        pass


class LLMService(LLMServiceInterface):
    def __init__(self, client):
        self._client = client

    async def answer(self, prompt: str, question: str) -> str:
        chat = await self._client.chat.completions.create(
            model=settings.llm_model,
            temperature=0,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Вопрос пользователя: {question}"},
            ],
        )
        return chat.choices[0].message.content or "Я не знаю."
