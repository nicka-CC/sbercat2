const SCAN_INTERVAL_MS = 1000;
const CHROMA_THRESHOLD = 20;
const CHROMA_MAX_GREEN = 180;

const video = document.getElementById('video');
const qrCanvas = document.getElementById('qr-canvas');
const qrCtx = qrCanvas.getContext('2d');

const catCanvas = document.getElementById('cat-canvas');
const catVideo = document.getElementById('sbercat-video');

let scanLoopId = null;
let catAnimationRequest = null;
let mediaStream = null;
let isAndroid = /Android/i.test(navigator.userAgent);
let catCtx;

let isStartingCamera = false;
let restartTimeout = null;

function forceRestart() {
    if (restartTimeout) return;

    restartTimeout = setTimeout(() => {
        restartTimeout = null;
        startCamera();
    }, 500);
}

function stopCamera() {
    if (scanLoopId) {
        clearInterval(scanLoopId);
        scanLoopId = null;
    }

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => {
            try { track.stop(); } catch(e){}
        });
        mediaStream = null;
    }

    if (video) {
        video.pause();
        video.srcObject = null;
    }
}

async function startCamera() {
    if (isStartingCamera) return;
    isStartingCamera = true;

    try {
        stopCamera();

        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 24, max: 24 }
            },
            audio: false
        });

        video.setAttribute("playsinline", true);
        video.muted = true;
        video.srcObject = mediaStream;

        await video.play();

        const track = mediaStream.getVideoTracks()[0];

        track.addEventListener("ended", forceRestart);
        track.addEventListener("mute", forceRestart);

        startScanningLoop();

    } catch (err) {
        console.error(err);
        const cameraAccessEl = document.getElementById('camera-access-required');
        if (cameraAccessEl) {
            cameraAccessEl.style.display = 'block';
        }
    }

    isStartingCamera = false;
}

function startScanningLoop() {
    if (scanLoopId) {
        clearInterval(scanLoopId);
    }

    scanLoopId = setInterval(() => {
        if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight || document.visibilityState !== 'visible') {
            return;
        }
        if (!mediaStream || mediaStream.getVideoTracks()[0].readyState !== "live") {
            forceRestart();
            return;
        }

        if (qrCanvas.width !== video.videoWidth) {
            qrCanvas.width = video.videoWidth;
            qrCanvas.height = video.videoHeight;
        }

        qrCtx.drawImage(video, 0, 0);

        try {
            const img = qrCtx.getImageData(0, 0, qrCanvas.width, qrCanvas.height);
            const code = jsQR(img.data, img.width, img.height);

            if (code) {
                stopCamera();
                window.location.href = code.data;
            }
        } catch (err) {
             console.error("QR Scan error:", err);
        }
    }, SCAN_INTERVAL_MS);
}


let frameCount = 0;

function drawCat() {
    if (!catCtx || !catVideo || catVideo.paused || isAndroid) {
        catAnimationRequest = null;
        return;
    }

    frameCount++;

    if (frameCount % 3 !== 0) {
        catAnimationRequest = requestAnimationFrame(drawCat);
        return;
    }

    catCtx.clearRect(0, 0, catCanvas.width, catCanvas.height);
    catCtx.drawImage(catVideo, 0, 0, catCanvas.width, catCanvas.height);

    let frame;

    try {
        frame = catCtx.getImageData(0, 0, catCanvas.width, catCanvas.height);
    } catch (err) {
        catAnimationRequest = requestAnimationFrame(drawCat);
        return;
    }

    const d = frame.data;

    for (let i = 0; i < d.length; i += 4) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        if (b > r + CHROMA_THRESHOLD && b > g + CHROMA_THRESHOLD && g < CHROMA_MAX_GREEN) {
            d[i + 3] = 0;
        }
    }

    catCtx.putImageData(frame, 0, 0);
    catAnimationRequest = requestAnimationFrame(drawCat);
}

function getPlatformVideoSrc(src) {
    if (isAndroid) {
        return src.replace(/\.mp4$/, '.webm');
    }
    return src;
}
function initCatVideo() {
    const initialSrc = getPlatformVideoSrc('mp4/waiting_coffe_25Fps.mp4');

    catVideo.src = initialSrc;
    catVideo.load();

    if (isAndroid) {
        if (catCanvas) catCanvas.remove();

        // ВОССТАНАВЛИВАЕМ стили
        catVideo.style.display = 'block';
        catVideo.style.position = 'absolute';
        catVideo.style.bottom = '14vh';
        catVideo.style.left = '10vw';
        catVideo.style.width = '120px';
        catVideo.style.zIndex = '5';
        catVideo.style.pointerEvents = 'none';

        catVideo.play().catch(() => {});
        return;
    }

    if (!catCanvas) return;

    catCtx = catCanvas.getContext('2d', { willReadFrequently: true });

    catVideo.addEventListener('loadeddata', () => {
        catCanvas.width = 700;
        catCanvas.height = (700 / catVideo.videoWidth) * catVideo.videoHeight;

        catVideo.play().catch(() => {});

        if (!catAnimationRequest) {
            catAnimationRequest = requestAnimationFrame(drawCat);
        }
    });
}


function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
        startCamera(); // всегда пересоздаём поток на iOS
    } else {
        stopCamera();
    }
}

function init() {
    initCatVideo();
    startCamera();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', stopCamera);
    window.addEventListener('beforeunload', stopCamera);
}

init();