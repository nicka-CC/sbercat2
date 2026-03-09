function preloadAssets(stationConfig, onComplete, elementsToUnhide) {
    const preloader = document.getElementById('preloader');
    const progressBar = document.getElementById('preloader-progress-bar');
    const progressText = document.getElementById('preloader-text');

    const isAndroid = /Android/i.test(navigator.userAgent);

    function getPlatformVideoSrc(src) {
        if (isAndroid) {
            return src.replace(/\.mp4$/, '.webm');
        }
        return src;
    }

    const assets = [
        ...Object.values(stationConfig)
            .filter(value => typeof value === 'string' && (value.endsWith('.mp4') || value.endsWith('.webm'))),
        './svg/array.svg'
    ].map(asset => {
        if (asset.endsWith('.mp4')) {
            return getPlatformVideoSrc(asset);
        }
        return asset;
    });

    let loadedCount = 0;
    const totalAssets = assets.length;

    if (totalAssets === 0) {
        startApp();
        return;
    }

    progressText.textContent = `Загрузка 0 / ${totalAssets}`;

    assets.forEach(assetUrl => {
        if (assetUrl.endsWith('.mp4') || assetUrl.endsWith('.webm')) {
            const video = document.createElement('video');
            video.src = assetUrl;
            video.preload = 'auto';
            video.addEventListener('canplaythrough', () => onAssetLoaded(assetUrl), { once: true });
            video.addEventListener('error', () => onAssetLoaded(assetUrl, true), { once: true }); // Treat error as "loaded" to not block the app
            video.load();
        } else if (assetUrl.endsWith('.svg') || assetUrl.endsWith('.png') || assetUrl.endsWith('.jpg')) {
            const img = new Image();
            img.src = assetUrl;
            img.onload = () => onAssetLoaded(assetUrl);
            img.onerror = () => onAssetLoaded(assetUrl, true);
        } else {
            // For other file types, we can't reliably preload, so just count them as loaded.
            onAssetLoaded(assetUrl);
        }
    });

    function onAssetLoaded(assetUrl, isError = false) {
        if (isError) {
            console.warn(`Could not load asset: ${assetUrl}. The app will continue.`);
        }
        loadedCount++;
        const progress = Math.round((loadedCount / totalAssets) * 100);
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `Загрузка ${loadedCount} / ${totalAssets}`;

        if (loadedCount === totalAssets) {
            // Short delay to allow the progress bar to reach 100% visually
            setTimeout(startApp, 300);
        }
    }

    function startApp() {
        preloader.style.display = 'none';

        if (elementsToUnhide && Array.isArray(elementsToUnhide)) {
            elementsToUnhide.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.classList.remove('hidden');
                }
            });
        }

        onComplete();
    }
}
