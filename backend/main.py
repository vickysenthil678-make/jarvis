import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

from agent import process_command

load_dotenv()

app = FastAPI(title="JARVIS Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CommandRequest(BaseModel):
    text: str

class CommandResponse(BaseModel):
    response: str

@app.post("/api/command", response_model=CommandResponse)
async def handle_command(request: CommandRequest):
    try:
        if not request.text:
            raise HTTPException(status_code=400, detail="Command text is empty")
        result = await process_command(request.text)
        return CommandResponse(response=result)
    except Exception as e:
        print(f"Error processing command: {e}")
        return CommandResponse(response=f"I encountered an error sir: {str(e)}")

frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")

# Serve individual frontend files with no-cache headers to prevent 304 stale cache issues
@app.get("/")
async def serve_index():
    path = os.path.join(frontend_dir, "index.html")
    return FileResponse(path, headers={
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    })

@app.get("/style.css")
async def serve_css():
    path = os.path.join(frontend_dir, "style.css")
    return FileResponse(path, media_type="text/css", headers={
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    })

@app.get("/app.js")
async def serve_js():
    path = os.path.join(frontend_dir, "app.js")
    return FileResponse(path, media_type="application/javascript", headers={
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
    })

@app.get("/favicon.ico")
async def serve_favicon():
    # Return a minimal 1x1 transparent ICO so the browser stops throwing 404
    # This is a valid minimal ICO file in bytes
    ico_bytes = (
        b'\x00\x00\x01\x00\x01\x00\x01\x01\x00\x00\x01\x00\x18\x00'
        b'\x30\x00\x00\x00\x16\x00\x00\x00\x28\x00\x00\x00\x01\x00'
        b'\x00\x00\x02\x00\x00\x00\x01\x00\x18\x00\x00\x00\x00\x00'
        b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00'
        b'\x00\x00\x00\x00\x00\xff\x00\xd2\xff\x00\x00\x00\x00'
    )
    return Response(content=ico_bytes, media_type="image/x-icon")

if __name__ == "__main__":
    import uvicorn
    # Bind to localhost (127.0.0.1) for local development
    # Chrome grants microphone access more reliably on "localhost" than "127.0.0.1"
    print("\n" + "="*70)
    print("  JARVIS server is starting up!")
    print("  Please open your browser to: http://localhost:8000")
    print("  Note: Do NOT open http://0.0.0.0:8000 (it is only the bind address).")
    print("="*70 + "\n")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
