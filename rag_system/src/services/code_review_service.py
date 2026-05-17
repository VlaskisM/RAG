from src.promts.prompt_code_review import code_review_prompt
from src.services.llm_service import LLMServiceInterface


class CodeReviewService:
    def __init__(self, llm_service: LLMServiceInterface):
        self._llm = llm_service

    async def review(self, code: str, filename: str = "", question: str = "") -> str:
        prompt = code_review_prompt()
        parts = []
        if filename:
            parts.append(f"Файл: **{filename}**\n")
        parts.append(f"```\n{code}\n```")
        if question:
            parts.append(f"\nДополнительный вопрос от разработчика: {question}")
        user_content = "\n".join(parts)
        return await self._llm.answer(prompt, user_content)
