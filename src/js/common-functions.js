const isAndroid = /Android/i.test(navigator.userAgent);
const isIOS = /iOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
// const isBudgetAndroid = (() => {
//     if (!isAndroid) return false;
//
//     // Consider "budget" if RAM is 4GB or less, or CPU cores are 4 or less.
//     // These are heuristics and may need adjustment.
//     const hasLowMemory = ('deviceMemory' in navigator && navigator.deviceMemory <= 4);
//     const hasLowCPU = ('hardwareConcurrency' in navigator && navigator.hardwareConcurrency <= 4);
//
//     return hasLowMemory || hasLowCPU;
// })();
const isBudgetAndroid = /Android/i.test(navigator.userAgent) && (navigator.deviceMemory || 6) < 8;
// const isBudgetAndroid = true;

function getPlatformVideoSrc(src) {
    const third = document.getElementById('third');
    const videoContainer = document.getElementById('video-container');
    if (third) {
        third.style.display = 'block';
    }

    if (isAndroid) {
        if(videoContainer) videoContainer.style.marginBottom = "2vh";
        if (third) {
            third.style.height = '12vh';
        }
        let newSrc = src.replace(/\.mp4$/, '.webm');
        if (isBudgetAndroid) {
            // For budget androids, use webm from folder /3/
            newSrc = newSrc.replace('https://nicka-cc.github.io/sbercat2/mp4/', 'https://nicka-cc.github.io/sbercat2/3/');
        }
        // For non-budget androids, it will use webm from /mp4/', which is the default for androids.
        return newSrc;
    } else {
        // For non-android devices (iOS, desktop), use mp4 from folder /2/
        return src.replace('https://nicka-cc.github.io/sbercat2/mp4/', 'https://nicka-cc.github.io/sbercat2/2/');
    }
}

async function startWebcam() {
    const videoElement = document.getElementById('webcam-feed');
    let videoConstraints = {
        video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 24, max: 24 }
        },
        audio: false
    };

    if (isBudgetAndroid) {
        videoConstraints.video.width = { ideal: 440 };
        videoConstraints.video.height = { ideal: 480 };
        videoConstraints.video.frameRate = { ideal: 15, max: 15 };
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
        videoElement.srcObject = stream;
        window.currentWebcamStream = stream;
    } catch (err) {
        console.error("Error accessing webcam: ", err);
        // document.getElementById('camera-access-required').style.display = 'block';
    }
}

function adjustVideoHeight() {
    const videos = document.querySelectorAll('video[id^="sbercat-video-"]');
    const height = isBudgetAndroid ? '100%' : '133%';
    videos.forEach(video => {
        video.style.height = height;
    });
}

document.addEventListener('DOMContentLoaded', adjustVideoHeight);

function stopWebcam() {
    if (window.currentWebcamStream) {
        window.currentWebcamStream.getTracks().forEach(track => track.stop());
        window.currentWebcamStream = null;
    }
}
