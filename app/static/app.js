document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // 1. API Configuration & State Variables
    // ==========================================================================
    const API_ENDPOINT = window.location.origin + '/predict';

    // Application state (extended for redesign badges)
    let state = {
        points: 0,
        stats: {
            cardboard: 0,
            glass: 0,
            metal: 0,
            paper: 0,
            plastic: 0,
            trash: 0
        },
        history: [],
        unlockedBadges: [] // List of badge IDs currently unlocked
    };

    // Camera variables
    let videoStream = null;
    let cameraFacingMode = 'environment';
    let autoDetectInterval = null;
    let isProcessing = false;
    let isCooldown = false;

    // Gamification settings
    const POINTS_CONFIG = {
        plastic: 15,
        glass: 20,
        metal: 25,
        cardboard: 10,
        paper: 10,
        trash: 5
    };

    const LEVEL_CONFIG = [
        { name: "Eco Novice", minPts: 0, maxPts: 99, badge: "fa-seedling", color: "#10b981" },
        { name: "Eco Ranger", minPts: 100, maxPts: 299, badge: "fa-leaf", color: "#06b6d4" },
        { name: "Eco Warrior", minPts: 300, maxPts: 599, badge: "fa-shield-halved", color: "#3b82f6" },
        { name: "Recycle Champion", minPts: 600, maxPts: 999, badge: "fa-trophy", color: "#eab308" },
        { name: "Earth Guardian", minPts: 1000, maxPts: Infinity, badge: "fa-globe", color: "#ec4899" }
    ];

    // Environmental Impact Constants (multiplier per item)
    const IMPACT_FACTORS = {
        co2: { plastic: 0.5, metal: 1.6, glass: 0.3, cardboard: 0.8, paper: 0.6, trash: 0 },
        energy: { plastic: 0.15, metal: 1.2, glass: 0.2, cardboard: 0.1, paper: 0.08, trash: 0 },
        water: { plastic: 2, metal: 3, glass: 1, cardboard: 5, paper: 4, trash: 0 },
        landfill: { plastic: 0.35, metal: 0.2, glass: 0.25, cardboard: 0.5, paper: 0.1, trash: 0 }
    };

    // Bins & Disposal Instructions (Semantic Theme Colors mapped)
    const DISPOSAL_CONFIG = {
        plastic: {
            binName: "KUNING",
            binClass: "bin-yellow",
            title: "Tempat Sampah Plastik",
            desc: "Khusus untuk botol minuman PET, cangkir plastik, dan kemasan plastik bersih.",
            steps: [
                "Bilas sisa cairan manis/minyak agar tidak mengundang semut.",
                "Lepas label plastik luar dan tutup botol (biasa jenis plastik berbeda).",
                "Pipihkan botol sebelum dibuang untuk menghemat tempat di tempat sampah."
            ],
            feedback: "Bagus! Satu botol plastik lagi terselamatkan dari lautan."
        },
        glass: {
            binName: "HIJAU",
            binClass: "bin-green",
            title: "Tempat Sampah Kaca",
            desc: "Botol sirup kaca, wadah toples selai kaca, dan beling transparan/berwarna.",
            steps: [
                "Bilas kotoran hingga bersih agar tidak memicu bakteri.",
                "Lepas tutup logam kaleng atau plastik penyumbat botol.",
                "Jangan mencampur kaca pecah dengan cermin atau bohlam di wadah ini."
            ],
            feedback: "Luar biasa! Kaca dapat didaur ulang tanpa batas waktu tanpa menurunkan kualitas."
        },
        metal: {
            binName: "ABU-ABU / MERAH",
            binClass: "bin-red",
            title: "Tempat Sampah Logam & Kaleng",
            desc: "Kaleng minuman aluminium, kaleng sarden besi, dan wadah kawat logam.",
            steps: [
                "Pastikan kaleng sudah kosong dari sisa makanan/cairan.",
                "Remas kaleng minuman aluminium hingga datar menggunakan kaki.",
                "Bersihkan sisa kemasan luar jika terbuat dari kertas tebal."
            ],
            feedback: "Hebat! Daur ulang kaleng menghemat 95% energi dibanding membuat logam baru."
        },
        cardboard: {
            binName: "BIRU",
            binClass: "bin-blue",
            title: "Tempat Sampah Kertas & Karton",
            desc: "Kardus cokelat kemasan, karton paket, kotak kemasan makanan kering.",
            steps: [
                "Pastikan karton/kardus bersih dan benar-benar kering.",
                "Buka lipatan lem kardus dan buat mendatar agar tidak makan tempat.",
                "Lepaskan lakban plastik atau staples logam yang masih menempel."
            ],
            feedback: "Mantap! Daur ulang kardus membantu mengurangi penebangan pohon di hutan."
        },
        paper: {
            binName: "BIRU",
            binClass: "bin-blue",
            title: "Tempat Sampah Kertas & Karton",
            desc: "Kertas tulis HVS, koran bekas, majalah, dokumen cetak tak terpakai.",
            steps: [
                "Kertas harus kering dan bebas dari minyak bekas makanan.",
                "Lepaskan staples besi atau klip kertas sebelum membuang.",
                "Jangan buang kertas nasi berminyak atau tisu basah ke sini."
            ],
            feedback: "Luar biasa! Kertas bekas Anda akan diproses kembali menjadi produk kertas daur ulang."
        },
        trash: {
            binName: "HITAM",
            binClass: "bin-gray",
            title: "Tempat Sampah Residu (Trash)",
            desc: "Sampah yang saat ini belum bisa didaur ulang secara efisien.",
            steps: [
                "Gunakan untuk tisu basah, puntung rokok, popok bayi, pembungkus makanan ringan perak foil.",
                "Pastikan sampah tidak mengandung cairan berlebih yang merembes.",
                "Jangan membuang limbah berbahaya B3 (seperti baterai atau neon) ke sini."
            ],
            feedback: "Sampah residu diterima untuk pembuangan yang aman di TPA."
        }
    };

    // Badge configuration details for local rendering
    const BADGE_DETAILS = {
        'first-save': { title: "Penyelamat Pertama", desc: "Berhasil mendeteksi sampah pertama Anda", icon: "fa-seedling" },
        'plastic-ambassador': { title: "Duta Plastik", desc: "Berhasil memilah 5 sampah plastik", icon: "fa-prescription-bottle" },
        'glass-saver': { title: "Penyelamat Kaca", desc: "Berhasil memilah 5 sampah kaca", icon: "fa-wine-bottle" },
        'metal-hero': { title: "Pahlawan Logam", desc: "Berhasil memilah 5 sampah logam", icon: "fa-sheet-metal" },
        'forest-guardian': { title: "Penjaga Hutan", desc: "Berhasil memilah 10 sampah kertas/karton", icon: "fa-tree" },
        'earth-protector': { title: "Penjaga Bumi", desc: "Berhasil mengumpulkan 500 poin daur ulang", icon: "fa-globe" }
    };

    // ==========================================================================
    // 2. DOM Elements Selection
    // ==========================================================================
    const navLinks = document.querySelectorAll('.nav-link, .bottom-nav-link');
    const sections = document.querySelectorAll('.tab-section');

    const sidebarLevelBadge = document.getElementById('sidebar-level-badge');
    const sidebarPointsVal = document.getElementById('sidebar-points-val');
    const mobilePointsVal = document.getElementById('mobile-points-val');

    // Dashboard
    const dashboardLevelName = document.getElementById('dashboard-level-name');
    const dashboardPointsCurrent = document.getElementById('dashboard-points-current');
    const dashboardPointsNext = document.getElementById('dashboard-points-next');
    const dashboardLevelProgress = document.getElementById('dashboard-level-progress');
    const levelHintText = document.getElementById('level-hint');
    const dashboardTotalItems = document.getElementById('dashboard-total-items');

    const impactCo2Val = document.getElementById('impact-co2-val');
    const impactEnergyVal = document.getElementById('impact-energy-val');
    const impactWaterVal = document.getElementById('impact-water-val');
    const impactLandfillVal = document.getElementById('impact-landfill-val');

    // Storytelling Analogy nodes
    const analogyCo2 = document.getElementById('analogy-co2');
    const analogyEnergy = document.getElementById('analogy-energy');
    const analogyWater = document.getElementById('analogy-water');
    const analogyLandfill = document.getElementById('analogy-landfill');

    // Counts & bars categories
    const countPlastic = document.getElementById('count-plastic');
    const countGlass = document.getElementById('count-glass');
    const countMetal = document.getElementById('count-metal');
    const countCardboard = document.getElementById('count-cardboard');
    const countPaper = document.getElementById('count-paper');
    const countTrash = document.getElementById('count-trash');

    const barPlastic = document.getElementById('bar-plastic');
    const barGlass = document.getElementById('bar-glass');
    const barMetal = document.getElementById('bar-metal');
    const barCardboard = document.getElementById('bar-cardboard');
    const barPaper = document.getElementById('bar-paper');
    const barTrash = document.getElementById('bar-trash');

    // Theme Toggle controls
    const btnThemeToggleSidebar = document.getElementById('btn-theme-toggle-sidebar');
    const btnThemeToggleMobile = document.getElementById('btn-theme-toggle-mobile');

    // Achievement Modal
    const achievementModal = document.getElementById('achievement-modal');
    const modalBadgeIcon = document.getElementById('modal-badge-icon');
    const modalBadgeTitle = document.getElementById('modal-badge-title');
    const modalBadgeDesc = document.getElementById('modal-badge-desc');
    const btnCloseModal = document.getElementById('btn-close-modal');

    // Scanner components
    const btnModeCamera = document.getElementById('btn-mode-camera');
    const btnModeUpload = document.getElementById('btn-mode-upload');
    const cameraViewport = document.getElementById('camera-viewport');
    const uploadViewport = document.getElementById('upload-viewport');
    const resultViewport = document.getElementById('result-viewport');
    const scanLine = document.getElementById('scan-line');
    const webcamFeed = document.getElementById('webcam-feed');
    const cameraErrorOverlay = document.getElementById('camera-error-overlay');
    const scannerLoading = document.getElementById('scanner-loading');
    const loadingText = document.getElementById('loading-text');

    const btnStartCamera = document.getElementById('btn-start-camera');
    const btnStartCameraFallback = document.getElementById('btn-start-camera-fallback');
    const btnStopCamera = document.getElementById('btn-stop-camera');
    const btnCapture = document.getElementById('btn-capture');
    const btnSwitchCamera = document.getElementById('btn-switch-camera');
    const toggleAutoDetect = document.getElementById('toggle-auto-detect');

    const dropZone = document.getElementById('drop-zone');
    const btnBrowseFile = document.getElementById('btn-browse-file');
    const fileInputScanner = document.getElementById('file-input-scanner');

    const resultsPlaceholder = document.getElementById('results-placeholder');
    const resultsActive = document.getElementById('results-active');
    const resultAnnotatedImg = document.getElementById('result-annotated-img');
    const pointsRewardCard = document.getElementById('points-reward-card');
    const pointsRewardTitle = document.getElementById('points-reward-title');
    const pointsRewardDesc = document.getElementById('points-reward-desc');

    const binColorClass = document.getElementById('bin-color-class');
    const binLabelText = document.getElementById('bin-label-text');
    const binNameTitle = document.getElementById('bin-name-title');
    const binDescText = document.getElementById('bin-desc-text');
    const recommendationSteps = document.getElementById('recommendation-steps');
    const detectionTableBody = document.getElementById('detection-table-body');
    const btnScanAgain = document.getElementById('btn-scan-again');

    // History & Toasts
    const historyTableBody = document.getElementById('history-table-body');
    const btnClearHistory = document.getElementById('btn-clear-history');
    const toastContainer = document.getElementById('toast-container');

    // Capture Canvas
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = 640;
    captureCanvas.height = 480;
    const captureCtx = captureCanvas.getContext('2d');

    // ==========================================================================
    // 3. Initialization & LocalStorage Load/Save
    // ==========================================================================
    function init() {
        loadState();
        setupTheme();
        setupNavigation();
        setupCameraControls();
        setupUploadControls();
        
        // Modal Closer
        btnCloseModal.addEventListener('click', () => {
            achievementModal.style.display = 'none';
        });

        updateUI();
    }

    function loadState() {
        const savedState = localStorage.getItem('recycle_ai_state_v2');
        if (savedState) {
            try {
                state = JSON.parse(savedState);
                if (!state.points) state.points = 0;
                if (!state.stats) state.stats = { cardboard: 0, glass: 0, metal: 0, paper: 0, plastic: 0, trash: 0 };
                if (!state.history) state.history = [];
                if (!state.unlockedBadges) state.unlockedBadges = [];
            } catch (e) {
                console.error("Error loading v2 state, migrating or resetting...", e);
                // Check if old state exists and migrate
                const oldState = localStorage.getItem('recycle_ai_state');
                if (oldState) {
                    try {
                        const parsed = JSON.parse(oldState);
                        state.points = parsed.points || 0;
                        state.stats = parsed.stats || { cardboard: 0, glass: 0, metal: 0, paper: 0, plastic: 0, trash: 0 };
                        state.history = parsed.history || [];
                        state.unlockedBadges = [];
                        saveState();
                    } catch (err) {
                        resetState();
                    }
                } else {
                    resetState();
                }
            }
        } else {
            // Check old state migration fallback
            const oldState = localStorage.getItem('recycle_ai_state');
            if (oldState) {
                try {
                    const parsed = JSON.parse(oldState);
                    state.points = parsed.points || 0;
                    state.stats = parsed.stats || { cardboard: 0, glass: 0, metal: 0, paper: 0, plastic: 0, trash: 0 };
                    state.history = parsed.history || [];
                    state.unlockedBadges = [];
                    saveState();
                } catch (e) {
                    resetState();
                }
            } else {
                resetState();
            }
        }
    }

    function resetState() {
        state = {
            points: 0,
            stats: { cardboard: 0, glass: 0, metal: 0, paper: 0, plastic: 0, trash: 0 },
            history: [],
            unlockedBadges: []
        };
        saveState();
    }

    function saveState() {
        localStorage.setItem('recycle_ai_state_v2', JSON.stringify(state));
    }

    // ==========================================================================
    // 4. Light/Dark Mode Manager
    // ==========================================================================
    function setupTheme() {
        // Load default theme (default dark, check localStorage)
        const savedTheme = localStorage.getItem('recycle_theme') || 'dark';
        setTheme(savedTheme);

        // Sidebar theme toggle
        btnThemeToggleSidebar.addEventListener('click', () => {
            const isLight = document.body.classList.contains('light-theme');
            setTheme(isLight ? 'dark' : 'light');
        });

        // Mobile top-bar theme toggle
        btnThemeToggleMobile.addEventListener('click', () => {
            const isLight = document.body.classList.contains('light-theme');
            setTheme(isLight ? 'dark' : 'light');
        });
    }

    function setTheme(theme) {
        if (theme === 'light') {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
            
            // Update button texts
            btnThemeToggleSidebar.querySelector('span').textContent = 'Mode Gelap';
            localStorage.setItem('recycle_theme', 'light');
        } else {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
            
            // Update button texts
            btnThemeToggleSidebar.querySelector('span').textContent = 'Mode Terang';
            localStorage.setItem('recycle_theme', 'dark');
        }
    }

    // ==========================================================================
    // 5. Tab Navigation
    // ==========================================================================
    function setupNavigation() {
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = link.getAttribute('data-tab');

                // Update styling
                navLinks.forEach(l => {
                    if (l.getAttribute('data-tab') === targetTab) {
                        l.classList.add('active');
                    } else {
                        l.classList.remove('active');
                    }
                });

                // Toggle tabs
                sections.forEach(sec => {
                    if (sec.id === `tab-${targetTab}`) {
                        sec.classList.add('active');
                    } else {
                        sec.classList.remove('active');
                    }
                });

                // Webcam switch control
                if (targetTab === 'scanner') {
                    if (btnModeCamera.classList.contains('active') && !videoStream) {
                        startWebcam();
                    }
                } else {
                    stopWebcam();
                }

                updateUI();
            });
        });
    }

    btnModeCamera.addEventListener('click', () => {
        if (btnModeCamera.classList.contains('active')) return;
        
        btnModeCamera.classList.add('active');
        btnModeUpload.classList.remove('active');
        cameraViewport.classList.add('active');
        uploadViewport.classList.remove('active');
        resultViewport.classList.remove('active');
        
        document.getElementById('camera-controls-panel').style.display = 'flex';
        startWebcam();
        resetScannerUI();
    });

    btnModeUpload.addEventListener('click', () => {
        if (btnModeUpload.classList.contains('active')) return;
        
        btnModeUpload.classList.add('active');
        btnModeCamera.classList.remove('active');
        uploadViewport.classList.add('active');
        cameraViewport.classList.remove('active');
        resultViewport.classList.remove('active');

        document.getElementById('camera-controls-panel').style.display = 'none';
        stopWebcam();
        resetScannerUI();
    });

    function resetScannerUI() {
        resultsActive.style.display = 'none';
        resultsPlaceholder.style.display = 'flex';
        resultAnnotatedImg.src = '';
    }

    // ==========================================================================
    // 6. Level & Badge Check Engine
    // ==========================================================================
    function getLevelInfo(pts) {
        let currentLevel = LEVEL_CONFIG[0];
        for (let i = 0; i < LEVEL_CONFIG.length; i++) {
            if (pts >= LEVEL_CONFIG[i].minPts) {
                currentLevel = LEVEL_CONFIG[i];
            }
        }

        const nextLevelIndex = LEVEL_CONFIG.indexOf(currentLevel) + 1;
        const nextLevel = nextLevelIndex < LEVEL_CONFIG.length ? LEVEL_CONFIG[nextLevelIndex] : null;

        let progressPercent = 0;
        let pointsNextLevel = pts;
        let hint = "Anda telah mencapai tingkat Eco tertinggi!";

        if (nextLevel) {
            const range = nextLevel.minPts - currentLevel.minPts;
            const progress = pts - currentLevel.minPts;
            progressPercent = Math.min(100, Math.max(0, (progress / range) * 100));
            pointsNextLevel = nextLevel.minPts;
            hint = `Kumpulkan ${nextLevel.minPts - pts} poin lagi untuk naik level ke ${nextLevel.name}!`;
        } else {
            progressPercent = 100;
        }

        return {
            name: currentLevel.name,
            icon: currentLevel.badge,
            color: currentLevel.color,
            current: pts,
            next: pointsNextLevel,
            percent: progressPercent,
            hint: hint
        };
    }

    // Evaluate badge thresholds
    function checkBadges(triggerCelebration = true) {
        let newlyUnlocked = [];

        // 1. Penyelamat Pertama
        if (state.history.length >= 1 && !state.unlockedBadges.includes('first-save')) {
            newlyUnlocked.push('first-save');
        }
        // 2. Duta Plastik (Plastic >= 5)
        if (state.stats.plastic >= 5 && !state.unlockedBadges.includes('plastic-ambassador')) {
            newlyUnlocked.push('plastic-ambassador');
        }
        // 3. Penyelamat Kaca (Glass >= 5)
        if (state.stats.glass >= 5 && !state.unlockedBadges.includes('glass-saver')) {
            newlyUnlocked.push('glass-saver');
        }
        // 4. Pahlawan Logam (Metal >= 5)
        if (state.stats.metal >= 5 && !state.unlockedBadges.includes('metal-hero')) {
            newlyUnlocked.push('metal-hero');
        }
        // 5. Penjaga Hutan (Paper + Cardboard >= 10)
        if (state.stats.paper + state.stats.cardboard >= 10 && !state.unlockedBadges.includes('forest-guardian')) {
            newlyUnlocked.push('forest-guardian');
        }
        // 6. Penjaga Bumi (Points >= 500)
        if (state.points >= 500 && !state.unlockedBadges.includes('earth-protector')) {
            newlyUnlocked.push('earth-protector');
        }

        if (newlyUnlocked.length > 0) {
            // Unlock all newly earned badges
            newlyUnlocked.forEach(badgeId => {
                state.unlockedBadges.push(badgeId);
            });
            saveState();

            // Open pop-up celebration for the LAST badge unlocked (or first in queue)
            if (triggerCelebration) {
                const latestBadge = newlyUnlocked[newlyUnlocked.length - 1];
                showBadgeCelebration(latestBadge);
            }
        }
    }

    function showBadgeCelebration(badgeId) {
        const badge = BADGE_DETAILS[badgeId];
        if (!badge) return;

        modalBadgeTitle.textContent = badge.title;
        modalBadgeDesc.textContent = badge.desc + ". Terus tingkatkan pilah sampah Anda untuk melestarikan lingkungan!";
        modalBadgeIcon.innerHTML = `<i class="fa-solid ${badge.icon}"></i>`;

        // Render modal view
        achievementModal.style.display = 'flex';
        
        // Show celebration toast
        showToast("Lencana Baru!", `Anda mendapatkan lencana: ${badge.title}`, "green");
    }

    // ==========================================================================
    // 7. UI Update Rendering Engine
    // ==========================================================================
    function updateUI() {
        const lvl = getLevelInfo(state.points);

        // Header / Profile badges
        sidebarLevelBadge.textContent = lvl.name;
        sidebarPointsVal.textContent = state.points;
        mobilePointsVal.textContent = state.points;

        // Avatar icon switch depending on level
        const sidebarAvatarIcon = document.getElementById('sidebar-avatar-icon');
        sidebarAvatarIcon.className = `fa-solid ${lvl.icon}`;

        // Tab 1: Dashboard
        dashboardLevelName.textContent = lvl.name;
        dashboardLevelName.style.color = lvl.color;
        
        const dashboardLevelIcon = document.getElementById('dashboard-level-icon');
        dashboardLevelIcon.className = `fa-solid ${lvl.icon} icon-badge-green`;
        dashboardLevelIcon.style.color = lvl.color;

        dashboardPointsCurrent.textContent = state.points;
        dashboardPointsNext.textContent = lvl.next;
        dashboardLevelProgress.style.width = `${lvl.percent}%`;
        levelHintText.textContent = lvl.hint;

        // Calculate total items
        let totalItems = 0;
        Object.keys(state.stats).forEach(cat => {
            totalItems += state.stats[cat];
        });
        dashboardTotalItems.textContent = totalItems;

        // Render breakdown charts
        let maxCount = 0;
        Object.keys(state.stats).forEach(cat => {
            if (state.stats[cat] > maxCount) maxCount = state.stats[cat];
        });

        const getBarWidth = (count) => {
            if (maxCount === 0) return '0%';
            return `${(count / maxCount) * 85 + 15}%`;
        };

        countPlastic.textContent = state.stats.plastic;
        barPlastic.style.width = state.stats.plastic > 0 ? getBarWidth(state.stats.plastic) : '0%';

        countGlass.textContent = state.stats.glass;
        barGlass.style.width = state.stats.glass > 0 ? getBarWidth(state.stats.glass) : '0%';

        countMetal.textContent = state.stats.metal;
        barMetal.style.width = state.stats.metal > 0 ? getBarWidth(state.stats.metal) : '0%';

        countCardboard.textContent = state.stats.cardboard;
        barCardboard.style.width = state.stats.cardboard > 0 ? getBarWidth(state.stats.cardboard) : '0%';

        countPaper.textContent = state.stats.paper;
        barPaper.style.width = state.stats.paper > 0 ? getBarWidth(state.stats.paper) : '0%';

        countTrash.textContent = state.stats.trash;
        barTrash.style.width = state.stats.trash > 0 ? getBarWidth(state.stats.trash) : '0%';

        // Evaluation & Update Badge cards
        checkBadges(false); // Check silently first during standard load UI
        renderBadgeCards();

        // Render Environmental Impacts
        calculateEcoImpacts();

        // Tab 3: History table
        renderHistory();
    }

    function renderBadgeCards() {
        // 1. First Save
        updateBadgeCardUI('first-save', state.history.length, 1);
        
        // 2. Plastic Ambassador
        updateBadgeCardUI('plastic-ambassador', state.stats.plastic, 5);
        
        // 3. Glass Saver
        updateBadgeCardUI('glass-saver', state.stats.glass, 5);
        
        // 4. Metal Hero
        updateBadgeCardUI('metal-hero', state.stats.metal, 5);
        
        // 5. Forest Guardian
        updateBadgeCardUI('forest-guardian', state.stats.paper + state.stats.cardboard, 10);
        
        // 6. Earth Protector
        updateBadgeCardUI('earth-protector', state.points, 500);
    }

    function updateBadgeCardUI(badgeId, current, target) {
        const card = document.getElementById(`badge-${badgeId}`);
        const progress = document.getElementById(`progress-${badgeId}`);
        if (!card || !progress) return;

        progress.textContent = `${Math.min(target, current)} / ${target}`;

        if (state.unlockedBadges.includes(badgeId)) {
            card.classList.remove('locked');
            card.classList.add('unlocked');
        } else {
            card.classList.add('locked');
            card.classList.remove('unlocked');
        }
    }

    // Storytelling converter calculations
    function calculateEcoImpacts() {
        let totalCo2 = 0;
        let totalEnergy = 0;
        let totalWater = 0;
        let totalLandfill = 0;

        Object.keys(state.stats).forEach(cat => {
            const count = state.stats[cat];
            totalCo2 += count * IMPACT_FACTORS.co2[cat];
            totalEnergy += count * IMPACT_FACTORS.energy[cat];
            totalWater += count * IMPACT_FACTORS.water[cat];
            totalLandfill += count * IMPACT_FACTORS.landfill[cat];
        });

        // Set value transitions
        animateCountValue('impact-co2-val', parseFloat(impactCo2Val.textContent) || 0, totalCo2, 2);
        animateCountValue('impact-energy-val', parseFloat(impactEnergyVal.textContent) || 0, totalEnergy, 2);
        animateCountValue('impact-water-val', parseFloat(impactWaterVal.textContent) || 0, totalWater, 1);
        animateCountValue('impact-landfill-val', parseFloat(impactLandfillVal.textContent) || 0, totalLandfill, 1);

        // Storytelling analogies descriptions
        analogyCo2.textContent = `Setara emisi pengisian daya HP ${Math.round(totalCo2 * 121)} kali`;
        analogyEnergy.textContent = `Cukup menyalakan lampu LED 10W ${(totalEnergy * 100).toFixed(0)} jam`;
        analogyWater.textContent = `Setara dengan ${Math.round(totalWater / 1.5)} botol air mineral 1.5L`;
        analogyLandfill.textContent = `Menghemat ruang volume ${Math.round(totalLandfill / 1.2)} kotak tisu`;
    }

    function animateCountValue(elementId, start, end, decimals = 0) {
        if (start === end) return;
        const duration = 800;
        const obj = document.getElementById(elementId);
        if (!obj) return;

        let startTime = null;

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const value = start + progress * (end - start);
            obj.textContent = value.toFixed(decimals);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        }
        window.requestAnimationFrame(step);
    }

    function renderHistory() {
        if (state.history.length === 0) {
            historyTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="table-empty">
                        <i class="fa-solid fa-folder-open"></i>
                        <p>Belum ada riwayat aktivitas. Mulai memindai di tab Scanner!</p>
                    </td>
                </tr>
            `;
            return;
        }

        historyTableBody.innerHTML = '';
        
        const sortedHistory = [...state.history].reverse();
        sortedHistory.forEach(item => {
            const tr = document.createElement('tr');
            
            const date = new Date(item.timestamp);
            const timeStr = date.toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric'
            }) + ' ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

            const classesHtml = Object.keys(item.detections).map(cls => {
                const count = item.detections[cls];
                let iconClass = 'fa-circle-question';
                let iconColor = 'text-gray';
                
                if (cls === 'plastic') { iconClass = 'fa-prescription-bottle'; iconColor = 'text-yellow'; }
                else if (cls === 'glass') { iconClass = 'fa-wine-bottle'; iconColor = 'text-green'; }
                else if (cls === 'metal') { iconClass = 'fa-sheet-metal'; iconColor = 'text-red'; }
                else if (cls === 'cardboard') { iconClass = 'fa-box'; iconColor = 'text-blue'; }
                else if (cls === 'paper') { iconClass = 'fa-newspaper'; iconColor = 'text-cyan'; }
                else if (cls === 'trash') { iconClass = 'fa-dumpster'; iconColor = 'text-gray'; }

                return `<span class="table-class-label" style="display:inline-flex; align-items:center; gap:4px; margin-right:8px;">
                    <i class="fa-solid ${iconClass} ${iconColor}"></i> ${capitalizeFirstLetter(cls)} (${count})
                </span>`;
            }).join(' ');

            let binColorClassText = 'bg-gray';
            if (item.binColor === 'KUNING') binColorClassText = 'bg-yellow';
            else if (item.binColor === 'HIJAU') binColorClassText = 'bg-green';
            else if (item.binColor === 'ABU-ABU / MERAH') binColorClassText = 'bg-red';
            else if (item.binColor === 'BIRU') binColorClassText = 'bg-blue';

            tr.innerHTML = `
                <td><span class="history-time">${timeStr}</span></td>
                <td><div style="display:flex; flex-wrap:wrap; gap:4px;">${classesHtml}</div></td>
                <td><strong>${item.totalCount}</strong></td>
                <td><span style="color:var(--accent-green); font-weight:700;">+${item.pointsEarned} pts</span></td>
                <td>
                    <span class="edu-bin-color ${binColorClassText}" style="font-size:0.65rem; padding: 2px 6px;">
                        ${item.binColor}
                    </span>
                </td>
            `;
            historyTableBody.appendChild(tr);
        });
    }

    // ==========================================================================
    // 8. Interactive Webcam Operations
    // ==========================================================================
    function setupCameraControls() {
        btnStartCamera.addEventListener('click', startWebcam);
        btnStartCameraFallback.addEventListener('click', startWebcam);
        
        btnStopCamera.addEventListener('click', () => {
            stopWebcam();
            showToast("Kamera Mati", "Video stream dinonaktifkan.", "purple");
        });

        btnCapture.addEventListener('click', () => {
            if (isProcessing) return;
            captureFrameAndPredict();
        });

        btnSwitchCamera.addEventListener('click', () => {
            cameraFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
            stopWebcam();
            startWebcam();
            showToast("Ganti Kamera", `Beralih ke kamera ${cameraFacingMode === 'user' ? 'depan' : 'belakang'}.`, "purple");
        });

        toggleAutoDetect.addEventListener('change', () => {
            if (toggleAutoDetect.checked) {
                startAutoDetect();
                showToast("Auto-Detect Aktif", "Memindai otomatis setiap 1.5 detik.", "green");
            } else {
                stopAutoDetect();
                showToast("Auto-Detect Mati", "Pemindaian otomatis dinonaktifkan.", "purple");
            }
        });

        btnScanAgain.addEventListener('click', () => {
            resultViewport.classList.remove('active');
            cameraViewport.classList.add('active');
            resetScannerUI();
            
            if (!videoStream) {
                startWebcam();
            }
        });
    }

    async function startWebcam() {
        if (videoStream) return;

        cameraErrorOverlay.style.display = 'none';
        btnStartCamera.disabled = true;

        const constraints = {
            video: {
                facingMode: cameraFacingMode,
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            videoStream = stream;
            webcamFeed.srcObject = stream;
            
            btnStartCamera.style.display = 'none';
            btnStopCamera.style.display = 'inline-flex';
            btnCapture.disabled = false;
            btnSwitchCamera.style.disabled = false;

            scanLine.classList.add('scanning');
            
            if (toggleAutoDetect.checked) {
                startAutoDetect();
            }
        } catch (err) {
            console.error("Camera access failed: ", err);
            cameraErrorOverlay.style.display = 'flex';
            btnStartCamera.disabled = false;
            btnStartCamera.style.display = 'inline-flex';
            btnStopCamera.style.display = 'none';
            btnCapture.disabled = true;
            scanLine.classList.remove('scanning');
            showToast("Kamera Gagal", "Gagal membuka kamera. Periksa perizinan browser.", "purple");
        }
    }

    function stopWebcam() {
        stopAutoDetect();
        
        if (videoStream) {
            const tracks = videoStream.getTracks();
            tracks.forEach(track => track.stop());
            videoStream = null;
        }

        webcamFeed.srcObject = null;
        btnStartCamera.style.display = 'inline-flex';
        btnStartCamera.disabled = false;
        btnStopCamera.style.display = 'none';
        btnCapture.disabled = true;
        scanLine.classList.remove('scanning');
    }

    function startAutoDetect() {
        stopAutoDetect();
        autoDetectInterval = setInterval(() => {
            if (!videoStream || isProcessing || isCooldown) return;
            captureFrameAndPredict(true);
        }, 1500);
    }

    function stopAutoDetect() {
        if (autoDetectInterval) {
            clearInterval(autoDetectInterval);
            autoDetectInterval = null;
        }
    }

    // ==========================================================================
    // 9. Capture & API Integration
    // ==========================================================================
    function captureFrameAndPredict(isAutoMode = false) {
        if (!videoStream) return;

        isProcessing = true;

        if (!isAutoMode) {
            scannerLoading.style.display = 'flex';
            loadingText.textContent = "Mengambil Gambar...";
        }

        try {
            captureCtx.drawImage(webcamFeed, 0, 0, captureCanvas.width, captureCanvas.height);
            
            captureCanvas.toBlob((blob) => {
                if (blob) {
                    if (!isAutoMode) {
                        loadingText.textContent = "Menganalisis dengan YOLOv8s...";
                    }
                    sendImageToBackend(blob, isAutoMode);
                } else {
                    isProcessing = false;
                    scannerLoading.style.display = 'none';
                }
            }, 'image/jpeg', 0.85);
        } catch (e) {
            console.error("Failed to capture canvas frame: ", e);
            isProcessing = false;
            scannerLoading.style.display = 'none';
        }
    }

    function sendImageToBackend(fileBlob, isAutoMode) {
        const formData = new FormData();
        formData.append('file', fileBlob, 'rvm_scan.jpg');

        fetch(API_ENDPOINT, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Gagal menghubungi server deteksi AI.');
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                processDetectionResults(data, isAutoMode);
            } else {
                throw new Error(data.detail || 'Deteksi AI gagal.');
            }
        })
        .catch(err => {
            console.error("API error:", err);
            if (!isAutoMode) {
                showToast("Error Deteksi", err.message, "purple");
            }
        })
        .finally(() => {
            isProcessing = false;
            scannerLoading.style.display = 'none';
        });
    }

    // ==========================================================================
    // 10. Detection Result & Storytelling Processor
    // ==========================================================================
    function processDetectionResults(data, isAutoMode) {
        const predictions = data.predictions || [];

        if (isAutoMode && predictions.length === 0) {
            return;
        }

        if (!isAutoMode && predictions.length === 0) {
            scannerLoading.style.display = 'none';
            resultViewport.classList.remove('active');
            cameraViewport.classList.add('active');
            
            showToast("Tidak Ditemukan", "Tidak ada sampah terdeteksi. Posisikan objek lebih dekat.", "purple");
            
            resultsActive.style.display = 'none';
            resultsPlaceholder.style.display = 'flex';
            return;
        }

        stopAutoDetect();
        isCooldown = true;

        resultAnnotatedImg.src = data.image;
        cameraViewport.classList.remove('active');
        resultViewport.classList.add('active');

        // Points & Categories counters
        let pointsEarned = 0;
        let detectionsSummary = {};
        let primaryClass = null;
        let maxConf = 0;

        predictions.forEach(pred => {
            const cls = pred.class.toLowerCase();
            const conf = pred.confidence;

            detectionsSummary[cls] = (detectionsSummary[cls] || 0) + 1;
            pointsEarned += POINTS_CONFIG[cls] || 5;

            if (conf > maxConf) {
                maxConf = conf;
                primaryClass = cls;
            }
        });

        // 1. Update State
        state.points += pointsEarned;
        
        Object.keys(detectionsSummary).forEach(cls => {
            const count = detectionsSummary[cls];
            if (state.stats[cls] !== undefined) {
                state.stats[cls] += count;
            } else {
                state.stats.trash += count;
            }
        });

        const primaryBinConfig = DISPOSAL_CONFIG[primaryClass] || DISPOSAL_CONFIG.trash;
        
        // Add to history list
        const newHistoryItem = {
            timestamp: new Date().getTime(),
            detections: detectionsSummary,
            totalCount: predictions.length,
            pointsEarned: pointsEarned,
            binColor: primaryBinConfig.binName
        };
        state.history.push(newHistoryItem);

        // Check if badges are unlocked
        checkBadges(true); // Trigger popups celebration if any newly unlocked

        // Save
        saveState();

        // 2. Render Scanner Details
        resultsPlaceholder.style.display = 'none';
        resultsActive.style.display = 'block';

        // Storytelling feedback messages
        let feedbackMsg = primaryBinConfig.feedback;
        if (predictions.length > 1) {
            feedbackMsg = "Luar biasa! Berbagai jenis sampah berhasil dipilah sekaligus. Bumi berterima kasih atas aksi Anda.";
        }
        pointsRewardDesc.textContent = `${feedbackMsg} (+${pointsEarned} poin)`;
        
        if (predictions.length > 1) {
            pointsRewardTitle.textContent = `${predictions.length} Sampah Teridentifikasi!`;
        } else {
            pointsRewardTitle.textContent = `${capitalizeFirstLetter(primaryClass)} Terdeteksi!`;
        }

        renderDisposalRecommendation(primaryClass);
        renderDetectionsTable(predictions);

        // 3. Global update
        updateUI();

        // 4. Toast alert
        showToast("Sampah Diterima!", `+${pointsEarned} Poin Daur Ulang!`, "green");

        // 5. Cooldown Loop (RVM simulator)
        if (isAutoMode) {
            showToast("Menunggu Sampah Baru...", "Silakan ganti objek dalam 3 detik.", "purple");
            
            setTimeout(() => {
                isCooldown = false;
                
                if (toggleAutoDetect.checked && document.getElementById('tab-scanner').classList.contains('active') && btnModeCamera.classList.contains('active')) {
                    resultViewport.classList.remove('active');
                    cameraViewport.classList.add('active');
                    resetScannerUI();
                    startAutoDetect();
                }
            }, 3500);
        }
    }

    function renderDisposalRecommendation(cls) {
        const config = DISPOSAL_CONFIG[cls] || DISPOSAL_CONFIG.trash;
        
        binColorClass.className = `bin-icon-container ${config.binClass}`;
        binLabelText.textContent = config.binName;
        binNameTitle.textContent = config.title;
        binDescText.textContent = config.desc;

        recommendationSteps.innerHTML = '';
        config.steps.forEach(step => {
            const li = document.createElement('li');
            li.textContent = step;
            recommendationSteps.appendChild(li);
        });
    }

    function renderDetectionsTable(predictions) {
        detectionTableBody.innerHTML = '';
        const sorted = [...predictions].sort((a, b) => b.confidence - a.confidence);

        sorted.forEach(pred => {
            const cls = pred.class.toLowerCase();
            const confPercent = Math.round(pred.confidence * 100);
            const itemPoints = POINTS_CONFIG[cls] || 5;

            let iconClass = 'fa-circle-question';
            let iconColor = 'text-gray';
            if (cls === 'plastic') { iconClass = 'fa-prescription-bottle'; iconColor = 'text-yellow'; }
            else if (cls === 'glass') { iconClass = 'fa-wine-bottle'; iconColor = 'text-green'; }
            else if (cls === 'metal') { iconClass = 'fa-sheet-metal'; iconColor = 'text-red'; }
            else if (cls === 'cardboard') { iconClass = 'fa-box'; iconColor = 'text-blue'; }
            else if (cls === 'paper') { iconClass = 'fa-newspaper'; iconColor = 'text-cyan'; }
            else if (cls === 'trash') { iconClass = 'fa-dumpster'; iconColor = 'text-gray'; }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <span style="display:inline-flex; align-items:center; gap:6px; font-weight:600;">
                        <i class="fa-solid ${iconClass} ${iconColor}"></i> ${capitalizeFirstLetter(pred.class)}
                    </span>
                </td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px; width:100%;">
                        <span style="font-weight:600; min-width:32px;">${confPercent}%</span>
                        <div style="height:4px; background:rgba(255,255,255,0.06); border-radius:2px; flex-grow:1; overflow:hidden;">
                            <div style="height:100%; background:var(--accent-green); width:${confPercent}%"></div>
                        </div>
                    </div>
                </td>
                <td><strong style="color:var(--accent-green);">+${itemPoints}</strong></td>
            `;
            detectionTableBody.appendChild(tr);
        });
    }

    // ==========================================================================
    // 11. Upload Drag & Drop handlers
    // ==========================================================================
    function setupUploadControls() {
        btnBrowseFile.addEventListener('click', (e) => {
            e.stopPropagation();
            fileInputScanner.click();
        });

        dropZone.addEventListener('click', () => {
            fileInputScanner.click();
        });

        fileInputScanner.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                processUploadedFile(e.target.files[0]);
            }
        });

        ['dragenter', 'dragover'].forEach(name => {
            dropZone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.style.borderColor = 'var(--accent-green)';
                dropZone.style.background = 'rgba(16, 185, 129, 0.04)';
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            dropZone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropZone.style.borderColor = 'var(--border-color)';
                dropZone.style.background = 'rgba(255, 255, 255, 0.01)';
            });
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                processUploadedFile(files[0]);
            }
        });
    }

    function processUploadedFile(file) {
        if (!file.type.startsWith('image/')) {
            showToast("Berkas Salah", "File harus berupa gambar (JPG, PNG).", "purple");
            return;
        }

        resetScannerUI();
        scannerLoading.style.display = 'flex';
        loadingText.textContent = "Mengunggah Gambar...";

        sendImageToBackend(file, false);
    }

    // ==========================================================================
    // 12. History Operations & Helper Utilities
    // ==========================================================================
    btnClearHistory.addEventListener('click', () => {
        if (state.history.length === 0) return;
        
        if (confirm("Apakah Anda yakin ingin menghapus seluruh riwayat deteksi, statistik poin, dan lencana?")) {
            resetState();
            updateUI();
            resetScannerUI();
            showToast("Riwayat Dihapus", "Seluruh riwayat, poin, dan lencana telah dibersihkan.", "purple");
        }
    });

    function showToast(title, desc, type = 'green') {
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'purple' ? 'toast-purple' : ''}`;
        
        const iconClass = type === 'purple' ? 'fa-circle-info toast-icon-purple' : 'fa-circle-check toast-icon-green';
        
        toast.innerHTML = `
            <i class="fa-solid ${iconClass} toast-icon"></i>
            <div class="toast-body">
                <span class="toast-title">${title}</span>
                <span class="toast-desc">${desc}</span>
            </div>
        `;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    function capitalizeFirstLetter(string) {
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // ==========================================================================
    // 13. Run Application
    // ==========================================================================
    init();
});
