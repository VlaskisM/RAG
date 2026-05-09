from fastapi import APIRouter, Request, Body, HTTPException

router = APIRouter(prefix="/query", tags=["query"])


@router.post("/")
async def ask_query(
    request: Request,
    question: str = Body(..., description="The question to ask the RAG system"),
):
    try:
        answer, _ = await request.app.state.query_service.ask(question)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
