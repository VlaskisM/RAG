import sys
sys.path.insert(0, str(__import__('pathlib').Path(__file__).parent.parent))
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )

