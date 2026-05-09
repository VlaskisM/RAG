from fastapi import APIRouter, Request, HTTPException, UploadFile, File

router = APIRouter(prefix="/data-loading", tags=["data-loading"])

@router.post("/")
async def load_data(request: Request, file: UploadFile = File(...)):
    try:
        await request.app.state.data_loading_service.ingest(file)
        return {"message": "Data loaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))