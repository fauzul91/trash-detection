import os
import io
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import cv2
import numpy as np

# Inisialisasi FastAPI
app = FastAPI(title="Trash Detection Web App")

# Izinkan CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Jalur model: Cari best.pt di root project atau current directory, fallback ke yolov8s.pt
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SEARCH_PATHS = [
    os.path.join(BASE_DIR, "best.pt"),
    "best.pt",
    os.path.join(BASE_DIR, "runs", "detect", "train", "weights", "best.pt"),
    os.path.join("runs", "detect", "train", "weights", "best.pt"),
    os.path.join(BASE_DIR, "yolov8s.pt"),
    "yolov8s.pt"
]

MODEL_PATH = None
for path in SEARCH_PATHS:
    if os.path.exists(path):
        MODEL_PATH = path
        break

if not MODEL_PATH:
    MODEL_PATH = "yolov8s.pt"

print(f"Loading YOLO model dari: {MODEL_PATH}")
try:
    model = YOLO(MODEL_PATH)
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Daftarkan static files (Frontend HTML, CSS, JS)
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=500, detail="Model YOLO tidak terisi atau gagal dimuat.")
    
    try:
        # Baca file image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Format file gambar tidak valid.")
        
        # Jalankan prediksi menggunakan YOLOv8
        results = model(img)
        
        # Ekstrak data deteksi
        predictions = []
        annotated_img = img.copy()
        
        for result in results:
            boxes = result.boxes
            # Render visualisasi bounding box pada gambar
            annotated_img = result.plot()
            
            for box in boxes:
                # Dapatkan koordinat, confidence, dan class ID
                xyxy = box.xyxy[0].tolist() # [xmin, ymin, xmax, ymax]
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                cls_name = model.names[cls_id]
                
                predictions.append({
                    "class": cls_name,
                    "confidence": conf,
                    "bbox": xyxy
                })
        
        # Encode gambar teranotasi ke JPEG base64 untuk dikirim ke frontend
        _, buffer = cv2.imencode('.jpg', annotated_img)
        # Kita bisa simpan sementara gambar hasil prediksi atau kirim format base64
        import base64
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return JSONResponse(content={
            "status": "success",
            "predictions": predictions,
            "image": f"data:image/jpeg;base64,{img_base64}"
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan deteksi: {str(e)}")

# Route untuk menyajikan halaman utama
@app.get("/")
async def get_index():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return JSONResponse(content={"message": "Frontend static/index.html belum dibuat."})

# Daftarkan folder static agar file css/js bisa diakses
app.mount("/static", StaticFiles(directory=static_dir), name="static")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
