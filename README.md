# RecycleAI - Trash Detection & Classification Web App

Aplikasi Web berbasis AI untuk mendeteksi dan mengklasifikasikan sampah secara otomatis menggunakan model **YOLOv8s** yang dilatih dengan dataset **TrashNet**. 

Proyek ini dirancang agar dapat dijalankan secara lokal dengan FastAPI serta dideploy dengan mudah: **Frontend** di Vercel dan **Backend** di Render/Railway/Koyeb.

---

## 📂 Struktur Folder Proyek

Struktur folder proyek ini telah dirapikan agar bersih dan terorganisir sebelum di-push ke GitHub:

```
trash-detection/
├── app/                      # Aplikasi utama (FastAPI & Frontend)
│   ├── main.py               # Backend FastAPI
│   └── static/               # File Frontend Statis (HTML, CSS, JS)
│       ├── index.html        # UI Utama Aplikasi
│       ├── style.css         # Desain Modern (Glassmorphism & Glow Orbs)
│       └── app.js            # Logika Frontend & Integrasi API
├── YOLOv5su/                 # Hasil eksperimen model YOLOv5su
├── YOLOv7-tiny/              # Hasil eksperimen model YOLOv7-tiny
├── YOLOv8s/                  # Hasil eksperimen model YOLOv8s (Model Utama)
├── YOLOv9s/                  # Hasil eksperimen model YOLOv9s
├── Project_Akhir_Comvis_YOLOv8s.ipynb # Notebook pelatihan Google Colab
├── best.pt                   # Bobot terbaik YOLOv8s (Hasil training)
├── yolov8s.pt                # Bobot pretrained default YOLOv8s
├── requirements.txt          # Python dependencies
└── .gitignore                # File git ignore
```

---

## ⚡ Cara Menjalankan secara Lokal

### 1. Prasyarat
Pastikan Anda sudah menginstal Python (versi 3.8 - 3.11 direkomendasikan).

### 2. Instalasi Dependensi
Buka terminal pada direktori proyek ini dan jalankan perintah:
```bash
pip install -r requirements.txt
```

### 3. Menjalankan Server FastAPI
Jalankan perintah berikut dari root folder proyek:
```bash
python app/main.py
```
Aplikasi akan mendeteksi file `best.pt` secara otomatis dan memuat model tersebut.

### 4. Akses Aplikasi
Buka browser Anda dan kunjungi:
[http://localhost:8000](http://localhost:8000)

---

## 🚀 Panduan Deploy

Karena model AI (PyTorch + OpenCV + YOLOv8) berukuran sangat besar (lebih dari 1GB), **tidak memungkinkan untuk menjalankan Backend di Vercel secara langsung** (karena limitasi ukuran paket serverless Vercel max 50MB-250MB).

Oleh karena itu, arsitektur terbaik adalah dengan memisahkan **Frontend (di Vercel)** dan **Backend (di Render/Railway)**.

### A. Deploy Backend ke Render (Gratis)
1. Buat akun di [Render.com](https://render.com/).
2. Buat layanan baru: **Web Service**.
3. Hubungkan ke repositori GitHub Anda.
4. Gunakan pengaturan berikut:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Setelah berhasil dideploy, Anda akan mendapatkan URL backend produksi (misalnya `https://trash-detection-backend.onrender.com`).

### B. Konfigurasi Frontend untuk Vercel
1. Buka file `app/static/app.js`.
2. Pada bagian paling atas, ubah nilai `https://trash-detection-backend.onrender.com/predict` dengan URL backend produksi Anda yang diperoleh dari langkah Render di atas:
   ```javascript
   const API_ENDPOINT = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
       ? '/predict'
       : 'https://URL-BACKEND-ANDA-DI-RENDER.onrender.com/predict';
   ```
3. Commit dan push perubahan tersebut ke GitHub.

### C. Deploy Frontend ke Vercel
1. Masuk ke [Vercel](https://vercel.com/) dan hubungkan repositori Anda.
2. Saat menambahkan proyek baru di Vercel, ubah **Root Directory** ke: `app/static`.
3. Klik **Deploy**. Frontend Anda akan dideploy sebagai situs statis yang sangat cepat dan gratis di Vercel!

---

## 📊 Kategori Sampah yang Didukung
* **Cardboard** (Karton)
* **Glass** (Kaca)
* **Plastic** (Plastik)
* **Paper** (Kertas)
* **Metal** (Logam)
* **Trash** (Residu/Sampah Umum)

---
*Dibuat untuk Project Akhir Computer Vision menggunakan YOLOv8s.*
