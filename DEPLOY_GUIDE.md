# Panduan Deploy Proyek RecycleAI secara Gratis

Dokumen ini berisi panduan lengkap langkah-demi-langkah untuk mendeploy aplikasi web deteksi sampah Anda secara gratis.

---

## 🏗️ Arsitektur Deployment

Aplikasi ini menggunakan model kecerdasan buatan (YOLOv8s) yang membutuhkan pustaka besar seperti PyTorch dan OpenCV. Karena **Vercel** hanya mendukung file statis dan fungsi serverless ringan (maksimal 50MB-250MB), backend Python tidak dapat dijalankan langsung di Vercel.

**Solusi Terbaik & 100% Gratis:**
1. **Backend (FastAPI + YOLOv8s):** Dideploy secara gratis di **Hugging Face Spaces** (sangat direkomendasikan karena memberikan spesifikasi gratis sebesar **16GB RAM**) atau **Render**.
2. **Frontend (HTML + CSS + JS):** Dideploy secara gratis di **Vercel** (sangat cepat untuk menyajikan antarmuka statis).

---

## 🛠️ Langkah 1: Deploy Backend (Pilih Salah Satu)

### Opsi A: Menggunakan Hugging Face Spaces (SANGAT DIREKOMENDASIKAN ⭐)
Hugging Face memberikan space gratis dengan memori besar (16GB RAM), sangat stabil untuk memuat model YOLOv8 tanpa takut terjadi *out-of-memory crash*.

1. **Daftar/Masuk** ke akun Anda di [Hugging Face](https://huggingface.co/).
2. Klik tombol **New** -> **Space** di bagian kanan atas profil Anda.
3. Isi kolom pembuatan Space:
   - **Space name**: misalnya `trash-detection-backend`
   - **License**: `mit` (atau bebas)
   - **Select the Space SDK**: Pilih **Docker** (Penting! Kita telah membuat `Dockerfile`).
   - **Choose a Docker template**: Pilih **Blank** (Kosong).
   - **Space visibility**: Pilih **Public**.
4. Klik **Create Space**.
5. **Upload file proyek Anda** ke Space tersebut:
   - Anda dapat menggunakan git clone repositori space tersebut ke komputer Anda, lalu copy seluruh file proyek ini (termasuk `best.pt`, `Dockerfile`, folder `app/`, `requirements.txt`, dll) ke dalamnya, lalu lakukan push.
   - Atau, Anda bisa langsung mengunggah file lewat tab **Files** di halaman Space Hugging Face Anda.
6. Tunggu proses *building* selesai (biasanya memakan waktu 3-5 menit).
7. Jika status sudah **Running**, cari URL aplikasi Anda. URL-nya akan terlihat seperti:
   `https://<username-huggingface>-<nama-space>.hf.space`
   *(Gunakan alamat ini untuk konfigurasi frontend di Langkah 2).*

---

### Opsi B: Menggunakan Render.com (Gratis)
Render mendukung hosting backend Python secara langsung dari GitHub. Namun, akun gratis Render membatasi RAM sebesar 512MB, sehingga startup model terkadang lambat atau mengalami *crash* jika RAM penuh.

1. **Daftar/Masuk** ke [Render.com](https://render.com/).
2. Di dashboard Render, klik **New +** -> **Web Service**.
3. Hubungkan akun GitHub Anda dan pilih repositori proyek ini.
4. Konfigurasikan Web Service dengan pengaturan berikut:
   - **Name**: `trash-detection-backend`
   - **Region**: Pilih yang terdekat (misal Singapore)
   - **Branch**: `main` (atau `master`)
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Pilih **Free**
5. Klik **Create Web Service**.
6. Render akan mulai mem-build backend Anda. Setelah selesai, Render akan memberikan URL publik di bawah nama aplikasi Anda (misalnya `https://trash-detection-backend.onrender.com`).

---

## 🌐 Langkah 2: Hubungkan Frontend ke Backend Baru

Setelah backend Anda berjalan di Hugging Face atau Render dan Anda memiliki URL-nya:

1. Buka file `app/static/app.js` di editor kode Anda.
2. Di baris paling atas, ganti URL placeholder di dalam variabel `API_ENDPOINT` dengan URL backend produksi Anda:

   *Jika menggunakan Hugging Face Spaces:*
   ```javascript
   const API_ENDPOINT = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
       ? '/predict'
       : 'https://username-space.hf.space/predict'; // <-- Ubah bagian ini
   ```

   *Jika menggunakan Render:*
   ```javascript
   const API_ENDPOINT = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
       ? '/predict'
       : 'https://trash-detection-backend.onrender.com/predict'; // <-- Ubah bagian ini
   ```

3. Simpan file tersebut, lalu lakukan **Commit** dan **Push** ke repositori GitHub Anda.

---

## ⚡ Langkah 3: Deploy Frontend ke Vercel (Gratis)

1. Masuk ke dashboard [Vercel](https://vercel.com/).
2. Klik **Add New** -> **Project**.
3. Pilih repositori GitHub Anda yang berisi proyek ini dan klik **Import**.
4. Pada bagian **Configure Project**:
   - Cari opsi **Root Directory**.
   - Klik **Edit** dan pilih folder **`app/static`** (Penting! Agar Vercel hanya mem-build file HTML/CSS/JS statis dari folder tersebut).
5. Klik **Deploy**.
6. Vercel akan mendeploy antarmuka Anda hanya dalam beberapa detik. Anda akan diberikan URL website gratis dari Vercel (misalnya `https://recycle-ai.vercel.app`).

**Selesai!** Sekarang situs web Anda yang di-host di Vercel akan mengirimkan gambar ke server backend gratis Anda untuk diproses oleh YOLOv8, lalu menampilkan hasilnya secara visual di web.
