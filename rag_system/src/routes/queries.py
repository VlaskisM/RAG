from fastapi import APIRouter, Request, Body, HTTPException

router = APIRouter(prefix="/query", tags=["query"])


@router.post("/")
async def ask_query(
    request: Request,
    question: str = Body(..., description="The question to ask the RAG system"),
):
    try:
        answer, chunks = await request.app.state.query_service.ask(question)
        return {
            "answer": answer,
            "sources": [
                {
                    "text": c.text,
                    "score": c.score,
                    "part": c.metadata.part_title,
                    "chapter": c.metadata.chapter_title,
                    "section": c.metadata.section_title,
                    "block_type": c.metadata.block_type,
                }
                for c in chunks
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
