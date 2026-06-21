document.addEventListener('DOMContentLoaded', () => {
    // Konfigurasi URL API: otomatis ke server lokal saat dev, atau gunakan URL backend produksi (misal Render/Railway) untuk Vercel.
    const API_ENDPOINT = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.endsWith('hf.space')
        ? '/predict'
        : 'https://fauzulakbar-trash-detection-backend.hf.space/predict';

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnBrowse = document.getElementById('btn-browse');
    
    const viewerPlaceholder = document.getElementById('viewer-placeholder');
    const viewerActive = document.getElementById('viewer-active');
    const loadingContainer = document.getElementById('loading-container');
    const resultImg = document.getElementById('result-img');
    
    const summaryCard = document.getElementById('summary-card');
    const resultTableBody = document.getElementById('result-table-body');

    // Click to browse files
    btnBrowse.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent triggering drop-zone click if nested (although not nested)
        fileInput.click();
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag and drop event listeners
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // Main file handler
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('File harus berupa gambar (JPG, JPEG, PNG).');
            return;
        }

        // Show loading state
        viewerPlaceholder.style.display = 'none';
        viewerActive.style.display = 'none';
        summaryCard.style.display = 'none';
        loadingContainer.style.display = 'flex';

        // Prepare Form Data
        const formData = new FormData();
        formData.append('file', file);

        // Upload dan prediksi
        fetch(API_ENDPOINT, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Terjadi kesalahan pada server saat memproses gambar.');
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                displayResults(data);
            } else {
                alert('Gagal mendeteksi: ' + (data.detail || 'Error tidak dikenal'));
                resetToPlaceholder();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message);
            resetToPlaceholder();
        });
    }

    function resetToPlaceholder() {
        loadingContainer.style.display = 'none';
        viewerActive.style.display = 'none';
        summaryCard.style.display = 'none';
        viewerPlaceholder.style.display = 'flex';
    }

    // Display predictions and annotated image
    function displayResults(data) {
        loadingContainer.style.display = 'none';
        
        // Show image
        resultImg.src = data.image;
        viewerActive.style.display = 'flex';

        // Populate table
        resultTableBody.innerHTML = '';
        const predictions = data.predictions;

        if (predictions.length === 0) {
            resultTableBody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                        Tidak ada objek sampah terdeteksi.
                    </td>
                </tr>
            `;
        } else {
            // Urutkan berdasarkan confidence tertinggi
            predictions.sort((a, b) => b.confidence - a.confidence);

            predictions.forEach(pred => {
                const confPercent = Math.round(pred.confidence * 100);
                let accuracyClass = 'badge-med';
                let accuracyText = 'Medium';

                if (confPercent >= 80) {
                    accuracyClass = 'badge-high';
                    accuracyText = 'Tinggi';
                }

                // Dapatkan icon berdasarkan kelas
                let iconClass = 'fa-circle-question';
                const clsLower = pred.class.toLowerCase();
                if (clsLower.includes('cardboard') || clsLower.includes('karton')) {
                    iconClass = 'fa-box';
                } else if (clsLower.includes('glass') || clsLower.includes('kaca')) {
                    iconClass = 'fa-wine-bottle';
                } else if (clsLower.includes('plastic') || clsLower.includes('plastik')) {
                    iconClass = 'fa-prescription-bottle';
                } else if (clsLower.includes('paper') || clsLower.includes('kertas')) {
                    iconClass = 'fa-newspaper';
                } else if (clsLower.includes('metal') || clsLower.includes('logam')) {
                    iconClass = 'fa-sheet-metal';
                } else if (clsLower.includes('trash') || clsLower.includes('sampah')) {
                    iconClass = 'fa-dumpster';
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <span class="table-class-label">
                            <i class="fa-solid ${iconClass}" style="color: var(--accent-green);"></i>
                            ${capitalizeFirstLetter(pred.class)}
                        </span>
                    </td>
                    <td>
                        <div class="conf-bar-wrapper">
                            <span class="conf-value">${confPercent}%</span>
                            <div class="conf-bar-bg">
                                <div class="conf-bar-fill" style="width: ${confPercent}%"></div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="accuracy-badge ${accuracyClass}">${accuracyText}</span>
                    </td>
                `;
                resultTableBody.appendChild(tr);
            });
        }

        // Show table summary
        summaryCard.style.display = 'block';
    }

    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
});
