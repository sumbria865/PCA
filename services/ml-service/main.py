from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import subprocess, os, tempfile, shutil

app = FastAPI(title="PCA Insight ML Service")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MONGO_URI = os.getenv("MONGODB_URI", "")

@app.get("/health")
def health():
    return {"service": "ml-service", "status": "ok"}

@app.post("/run-pca")
async def run_pca(
    file: UploadFile = File(...),
    analysis_id: str = Form(...),
    components: int  = Form(2),
    sample_size: int = Form(5000)
):
    tmp = tempfile.mkdtemp()
    file_path = os.path.join(tmp, file.filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    result = subprocess.run([
        "python", "run_pca.py",
        "--analysis-id", analysis_id,
        "--file", file_path,
        "--components", str(components),
        "--sample-size", str(sample_size),
        "--mongo-uri", MONGO_URI
    ], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__)))
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": "PCA complete", "output": result.stdout}

@app.post("/run-rnn")
async def run_rnn(
    file: UploadFile       = File(...),
    rnn_id: str            = Form(...),
    pca_components: int    = Form(0),
    variance_threshold: float = Form(0.85),
    sample_size: int       = Form(10000),
    epochs: int            = Form(30),
    batch_size: int        = Form(64),
    lstm_units: int        = Form(64),
    dropout: float         = Form(0.3)
):
    tmp = tempfile.mkdtemp()
    file_path = os.path.join(tmp, file.filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    result = subprocess.run([
        "python", "run_rnn.py",
        "--rnn-id", rnn_id,
        "--file", file_path,
        "--pca-components", str(pca_components),
        "--variance-threshold", str(variance_threshold),
        "--sample-size", str(sample_size),
        "--epochs", str(epochs),
        "--batch-size", str(batch_size),
        "--lstm-units", str(lstm_units),
        "--dropout", str(dropout),
        "--mongo-uri", MONGO_URI
    ], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__)))
    if result.returncode != 0:
        raise HTTPException(status_code=500, detail=result.stderr)
    return {"message": "RNN complete", "output": result.stdout}
