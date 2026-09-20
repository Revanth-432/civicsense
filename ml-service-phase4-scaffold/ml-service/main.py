"""
CivicSense ML Service — FastAPI entrypoint (Direct Upload).
"""

import os
import shutil
from fastapi import FastAPI, HTTPException, UploadFile, File, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO

app = FastAPI(title="CivicSense ML Service")

API_SECRET_KEY = "civicsense-internal-secret"
MAX_FILE_SIZE = 10 * 1024 * 1024 # 10MB

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the trained model into memory at startup
model = YOLO("model/rdd_baseline.pt")

class Detection(BaseModel):
    cls: str
    confidence: float
    bbox: dict

class PredictResponse(BaseModel):
    detections: list[Detection]

@app.get("/health")
def health():
    return {"status": "ok"}

async def process_image(file: UploadFile):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
        
    # File size validation (10MB limit)
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10MB.")
    file.file.seek(0)
        
    temp_file_path = f"temp_{file.filename}"
    
    try:
        # 1. Save the uploaded file to disk locally
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 2. Run YOLO inference on the local file
        results = model.predict(source=temp_file_path, conf=0.10)
        
        # 3. Parse the results
        detections = []
        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                x, y, w, h = box.xywh[0].tolist()
                
                detections.append(
                    Detection(
                        cls=model.names[cls_id],
                        confidence=round(conf, 3),
                        bbox={
                            "x": round(x, 2),
                            "y": round(y, 2),
                            "width": round(w, 2),
                            "height": round(h, 2)
                        }
                    )
                )
        
        return PredictResponse(detections=detections)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")
        
    finally:
        # 4. Clean up the temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.post("/predict-preview", response_model=PredictResponse)
async def predict_preview(file: UploadFile = File(...)):
    """Public endpoint for the React frontend live demo."""
    return await process_image(file)

def verify_api_key(x_ml_service_key: str = Header(None)):
    if x_ml_service_key != API_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid or missing X-ML-Service-Key")
    return x_ml_service_key

@app.post("/predict", response_model=PredictResponse)
async def predict_internal(file: UploadFile = File(...), api_key: str = Depends(verify_api_key)):
    """Secured internal endpoint for the Node.js backend."""
    return await process_image(file)