function preloadAssets(stationConfig, onComplete, elementsToUnhide, htmlPagesToPreload = [], cssAssets = [], fontAssets = [], jsAssets = []) {
    const preloader = document.getElementById('preloader');
    const progressBar = document.getElementById('preloader-progress-bar');
    const progressText = document.getElementById('preloader-text');

    const isAndroid = /Android/i.test(navigator.userAgent);
    const isBudgetAndroid = /Android/i.test(navigator.userAgent) && (navigator.deviceMemory || 6) < 8;

    let failedAssets = [];

    function getPlatformVideoSrc(src) {
        if (isAndroid) {
            let newSrc = src.replace(/\.mp4$/, '.webm');
            if (isBudgetAndroid) {
                // For budget androids, use webm from folder /3/
                newSrc = newSrc.replace('https://nicka-cc.github.io/sbercat2/mp4/', 'https://nicka-cc.github.io/sbercat2/3/');
            }
            // For non-budget androids, it will use webm from /mp4/, which is the default for androids.
            return newSrc;
        } else {
            // For non-android devices (iOS, desktop), use mp4 from folder /2/
            return src.replace('https://nicka-cc.github.io/sbercat2/mp4/', 'https://nicka-cc.github.io/sbercat2/2/');
        }
    }

    function fetchWithRetry(url, options = {}, retries = 2, delay = 1500) {
        return new Promise((resolve, reject) => {
            const attempt = () => {
                fetch(url, options)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        resolve(response);
                    })
                    .catch(error => {
                        if (retries > 0) {
                            console.warn(`Fetch failed for ${url}, retrying in ${delay}ms... ${retries} attempts left.`);
                            setTimeout(attempt, delay);
                            retries--;
                        } else {
                            console.error(`Failed to fetch ${url} after multiple retries.`);
                            reject(error);
                        }
                    });
            };
            attempt();
        });
    }

    function processAssets(assetList) {
        let loadedCount = 0;
        const totalAssets = assetList.length;
        progressBar.style.width = '0%';
        progressText.textContent = `Загрузка 0 / ${totalAssets}`;

        if (totalAssets === 0) {
            finishPreloading();
            return;
        }

        const assetPromises = assetList.map(assetUrl => {
            return new Promise(resolve => {
                const onSingleAssetLoaded = () => {
                    loadedCount++;
                    const progress = Math.round((loadedCount / totalAssets) * 100);
                    progressBar.style.width = `${progress}%`;
                    progressText.textContent = `Загрузка ${loadedCount} / ${totalAssets}`;
                    resolve();
                };

                const onSingleAssetFailed = () => {
                    if (!failedAssets.includes(assetUrl)) {
                        failedAssets.push(assetUrl);
                    }
                    // Still resolve to allow Promise.all to complete
                    resolve();
                };

                if (assetUrl.endsWith('.mp4') || assetUrl.endsWith('.webm')) {
                    fetchWithRetry(assetUrl)
                        .then(response => response.blob())
                        .then(blob => {
                            window.preloadedVideoBlobs[assetUrl] = URL.createObjectURL(blob);
                            // No need for temp video check, assume blob is valid
                            onSingleAssetLoaded();
                        })
                        .catch(() => onSingleAssetFailed());
                } else if (assetUrl.endsWith('.svg') || assetUrl.endsWith('.png') || assetUrl.endsWith('.jpg')) {
                    const img = new Image();
                    img.src = assetUrl;
                    img.onload = onSingleAssetLoaded;
                    img.onerror = onSingleAssetFailed;
                } else {
                    onSingleAssetLoaded(); // Should not be a real asset
                }
            });
        });

        Promise.all(assetPromises).then(finishPreloading);
    }

    function finishPreloading() {
        if (failedAssets.length > 0) {
            progressText.textContent = "Ошибка загрузки. Проверьте интернет-соединение.";
            progressBar.style.width = '100%'; // Visually indicate an error state
            progressBar.style.backgroundColor = 'red';

            let retryButton = document.getElementById('preloader-retry-btn');
            if (!retryButton) {
                retryButton = document.createElement('button');
                retryButton.id = 'preloader-retry-btn';
                retryButton.textContent = 'Попробовать снова';
                retryButton.style.marginTop = '20px';
                retryButton.style.padding = '10px 20px';
                retryButton.style.fontSize = '16px';
                retryButton.style.cursor = 'pointer';

                const progressContainer = document.getElementById('preloader-progress-container');
                progressContainer.parentNode.insertBefore(retryButton, progressContainer.nextSibling);
            }

            retryButton.onclick = () => {
                const assetsToRetry = [...failedAssets];
                failedAssets = []; // Clear the list for the next attempt
                progressBar.style.backgroundColor = ''; // Reset color
                retryButton.remove(); // Remove button to prevent multiple clicks
                processAssets(assetsToRetry);
            };

        } else {
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

    // --- Initial Execution ---
    const videoAssets = Object.values(stationConfig)
        .filter(value => typeof value === 'string' && (value.endsWith('.mp4') || value.endsWith('.webm')))
        .map(asset => getPlatformVideoSrc(asset));

    const allAssets = [
        ...new Set(videoAssets),
        './svg/array.svg',
    ].filter(Boolean);

    window.preloadedVideoBlobs = window.preloadedVideoBlobs || {};
    processAssets(allAssets);
}
