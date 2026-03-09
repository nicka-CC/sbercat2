
function getUrlParams() {
    const params = {};
    const search = window.location.search.substring(1);
    const pairs = search.split('&');
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split('=');
        if (pair.length === 2) {
            params[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
        }
    }
    return params;
}

function initializeApp(stationConfig, stationNumber) {
    const {
        introVideo,
        waitingVideo,
        newStationVideo,
        wrongStationVideo,
        correctAnswerVideo,
        wrongAnswerVideo,
        nextStation,
        questionPool,
        questionPoolTenn
    } = stationConfig;

    const urlParams = getUrlParams();
    const SCENE_UUID = urlParams.uuid || 'faf5826f-6089-42a9-a72c-9e19c95aca05';
    const STATION = stationNumber;
    const isAndroid = /Android/i.test(navigator.userAgent);
    let activeVideo;
    let currentQuestionAudio = null;
    let onLastQuestion = false;
    let currentWebcamStream = null;
    let shouldShowNextButtonAfterNewStationVideo = false; // New flag for iOS button issue // Declare currentWebcamStream here

    const startBtn = document.getElementById("startBtn");
    const topAsk = document.getElementById('topAsk');
    // fitTextToContainer(topAsk, 44, 10);
    const ui = document.getElementById('ui');
    const desc = document.getElementById('desc');
    const controls = document.getElementById('controls');
    const controlskl = document.getElementById('kl');
    const questionCounter = document.getElementById('questionCounter');
    const soundStartBtn = document.getElementById("soundStartBtn");
    const interactionPopup = document.getElementById('interaction-required-popup');
    const interactionBtn = document.getElementById('interaction-btn');
    const blurOverlay = document.getElementById('blur-overlay');
    const soundOverlay = document.getElementById('soundOverlay');
    const videoContainer = document.getElementById('video-container');
    const third = document.getElementById('third');
    const video1 = document.getElementById('sbercat-video-1');
    const video2 = document.getElementById('sbercat-video-2');
    const canvas = document.getElementById('cat-canvas');
    let ctx;


    function handleWrongStation() {
        blurOverlay.style.display = 'block';
        soundOverlay.style.display = 'none';
        controlskl.style.display = 'none';
        questionCounter.style.display = 'none';
        stopAllAudio();

        topAsk.style.display = 'flex';
        topAsk.style.background = '';
        topAsk.style.backdropFilter = '';
        topAsk.innerHTML = `<div><div style="text-align: center; padding-bottom: 5px; font-size: 50px;">Эй, следопыт, ты потерялся!</div><div >Это не та станция. Вернись к предыдущей и следуй по следам!</div></div>`;
        fitTextToContainer(topAsk, 44, 10);
        
        ui.style.display = 'block';
        ui.style.background = 'rgba(255, 255, 255, 0)';
        ui.style.padding = '25px';
        
        desc.textContent = '';
        controls.innerHTML = '';

        const wrongStationBtn = document.createElement('button');
        wrongStationBtn.id = 'wrongStationBtn';
        wrongStationBtn.className = 'primary';
        wrongStationBtn.textContent = 'Вернуться к поиску';
        wrongStationBtn.style.display = 'none';
        wrongStationBtn.onclick = function () {
            blurOverlay.style.display = 'none';
            window.location.href = 'qr.html';
        };
        controls.appendChild(wrongStationBtn);
        playVideo(wrongStationVideo);
        [...document.querySelectorAll("video")].forEach(v => v.muted = false);
    }

    function fitTextToContainer(container, baseFontSize = 30, minFontSize = 5) {
        const innerDiv = container.firstElementChild;
        if (!innerDiv) return;

        let fontSize = baseFontSize;
        innerDiv.style.fontSize = fontSize + 'px';

        const maxHeight = container.clientHeight;

        while (innerDiv.scrollHeight > maxHeight && fontSize > minFontSize) {
            fontSize -= 5;
            innerDiv.style.fontSize = fontSize + 'px';
        }
    }

    function updateCounter(currentIndex, total) {
        questionCounter.style.display = 'block'
        questionCounter.textContent = `Вопрос ${currentIndex + 1}/${total}`;
    }

    function stopAllAudio() {
        if (currentQuestionAudio) {
            try {
                currentQuestionAudio.pause();
                currentQuestionAudio.currentTime = 0;
            } catch (e) {
                console.error("Could not stop audio", e);
            }
        }
    }

    async function createStatistics(sceneUuid, station, points = null) {
        const userUuid = localStorage.getItem('user_id');
        try {
            const body = { user_uuid: userUuid, scene_uuid: sceneUuid, station };
            if (points !== null) body.points = points;

            const response = await fetch(`${API_BASE_URL}/webapp/create_statistics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'api_key': API_KEY },
                body: JSON.stringify(body)
            });
            if (!response.ok) {
                console.error('Failed to create statistics:', response.status);
            }
        } catch (error) {
            console.error('Error creating statistics:', error);
        }
    }

    function getPlatformVideoSrc(src) {
        third.style.display = 'block';
        if (isAndroid) {
            videoContainer.style.marginBottom = "2vh";
            third.style.height = '12vh';
            return src.replace(/\.mp4$/, '.webm');
        }
        return src;
    }

    function playVideo(src, loop = false, forceSound = false, onPlayCallback = null) {
        if (!src) {
            console.error("playVideo called with invalid src");
            return;
        }
        let nextVideo = (activeVideo === video1) ? video2 : video1;
        const videoSrc = getPlatformVideoSrc(src);

        if (activeVideo && activeVideo.currentSrc && activeVideo.currentSrc.includes(videoSrc)) {
            activeVideo.loop = loop;
            activeVideo.currentTime = 0;
            activeVideo.play().catch(() => {});
            return;
        }

        nextVideo.loop = loop;
        nextVideo.preload = "auto";
        if (forceSound) nextVideo.muted = false;
        if (!nextVideo.currentSrc || !nextVideo.currentSrc.includes(videoSrc)) {
            nextVideo.src = videoSrc;
        }
        
        nextVideo.load();

        nextVideo.addEventListener('canplay', () => {
            nextVideo.play().catch(e => console.error("Video play failed:", e));
        }, { once: true });

        nextVideo.addEventListener('playing', () => {
            if (activeVideo) {
                activeVideo.pause();
                activeVideo.style.display = 'none';
            }
            nextVideo.style.display = 'block';
            activeVideo = nextVideo;

            if (!isAndroid) {
                canvas.style.display = 'block';
                video1.style.display = 'none';
                video2.style.display = 'none';
            }

            if (onPlayCallback) onPlayCallback(nextVideo);
        }, { once: true });
    }

    function setupQuiz() {
        topAsk.innerHTML = `<div><div style="text-align: center; padding-bottom: 5px; font-size: 44px;">Привет, следопыт!</div><div style="align-items: center; display: flex">Смотри-ка, ты отлично справился — нашёл мои следы-подсказки!<br>Готов начать викторину?</p></div></div>`;
        desc.textContent = '';
        ui.style.background = 'rgba(153,255,221,0)';
        ui.style.padding = '0';
        createStatistics(SCENE_UUID, STATION);
        let qCountLS = parseInt(localStorage.getItem('questionCount'), 10);
        let difficulty = localStorage.getItem('difficulty');
        if (isNaN(qCountLS) || qCountLS <= 0) qCountLS = 9;
        let numQuestions = Math.max(1, Math.floor(qCountLS / 3));

        const pool = difficulty === 'teen' ? questionPoolTenn : questionPool;
        if (numQuestions > pool.length) numQuestions = pool.length;

        function pickRandomQuestions(p, n) {
            const a = p.slice();
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a.slice(0, n);
        }

        let questions = pickRandomQuestions(pool, numQuestions);
        let currentIndex = 0;
        let totalBalls = parseInt(localStorage.getItem('total_balls') || '0', 10);
        let sessionBalls = 0;
        
        startBtn.addEventListener('click', () => {
            topAsk.style.marginTop = '8vh';
            updateCounter(1, questions.length);
            if (!activeVideo || !activeVideo.src.includes(waitingVideo)) {
                playVideo(waitingVideo, true);
            }
            startQuiz();
        });

        function startQuiz() {
            currentIndex = 0;
            onLastQuestion = false;
            renderQuestion(currentIndex);
        }

        function renderQuestion(idx) {
            if (idx >= questions.length) return finishQuiz();
            const q = questions[idx];
            stopAllAudio();
            updateCounter(idx, questions.length);

            if(activeVideo) activeVideo.muted = true;

            topAsk.innerHTML = `<div><div style="text-align: center; padding-bottom: 5px; font-size: 44px;">${q.title}</div><div>${q.question}</div></div>`;
            fitTextToContainer(topAsk, 44, 10);
            desc.textContent = '';
            ui.style.background = 'rgba(153,255,221,0.01)';
            ui.style.padding = '0';
            controls.innerHTML = '';
            q.options.forEach((opt, i) => {
                const b = document.createElement('button');
                b.className = 'optionBtn';
                b.textContent = (['A)', 'B)', 'C)'][i] || (i + 1) + ')') + ' ' + opt;
                b.addEventListener('click', () => onAnswer(i, idx));
                controls.appendChild(b);
            });

            controlskl.textContent = '';
            controlskl.style.display = 'block';
            const scoreLine2 = document.createElement('p2');
            scoreLine2.style.color = '#ffffff';
            scoreLine2.style.marginTop = '8px';
            scoreLine2.textContent = `Баллы: ${Number(sessionBalls + totalBalls)}`;
            controlskl.appendChild(scoreLine2);
        }

        function onAnswer(selectedIndex, questionIdx) {
            const q = questions[questionIdx];
            onLastQuestion = (questionIdx + 1) >= questions.length;

            controls.innerHTML = '';
            ui.style.background = 'rgba(153,255,221,0)';
            ui.style.padding = '0';
            desc.textContent = '';

            if (selectedIndex === q.correctIndex) {
                sessionBalls += 1;
                controlskl.querySelector('p2').textContent = `Баллы: ${Number(sessionBalls + totalBalls)}`;
                createStatistics(SCENE_UUID, STATION, 1);
                topAsk.innerHTML = `<div><div style="text-align: center; padding-bottom: 5px;font-size: 44px;">Правильно!</div><div>${q.rightText}</div></div>`;
                fitTextToContainer(topAsk, 44, 10);
                playVideo(correctAnswerVideo, false, false, (video) => {
                    video.addEventListener('ended', () => {
                        const nextBtn = document.createElement('button');
                        nextBtn.className = 'primary';
                        nextBtn.textContent = 'Далее';
                        nextBtn.addEventListener('click', onLastQuestion ? finishQuiz : () => renderQuestion(questionIdx + 1));
                        controls.appendChild(nextBtn);
                    }, { once: true });
                });
            } else {
                createStatistics(SCENE_UUID, STATION, 0);
                topAsk.innerHTML = `<div><div style="text-align: center; padding-bottom: 5px;font-size: 44px;">Подумай ещё</div><div>${q.wrongText}</div></div>`;
                fitTextToContainer(topAsk, 44, 10);
                playVideo(wrongAnswerVideo, false, false, (video) => {
                    video.addEventListener('ended', () => {
                        const retryBtn = document.createElement('button');
                        retryBtn.className = 'primary';
                        retryBtn.textContent = 'Попробовать ещё';
                        retryBtn.addEventListener('click', () => renderQuestion(questionIdx));
                        controls.appendChild(retryBtn);
                    }, { once: true });
                });
            }
        }

        function finishQuiz() {
            createStatistics(SCENE_UUID, STATION);
            stopAllAudio();
            onLastQuestion = false;
            playVideo(waitingVideo, true);

            topAsk.innerHTML = `<div><div style="text-align: center; padding-bottom: 5px;font-size: 44px;">Отличная работа!</div><div>Ты прошёл станцию. Твои баллы: ${Number(sessionBalls + totalBalls)}</div></div>`;
            desc.textContent = '';
            ui.style.background = 'rgba(153,255,221,0)';
            ui.style.padding = '0';
            controls.innerHTML = '';
            const next = document.createElement('button');
            next.className = 'primary';
            next.textContent = 'Сканировать код';
            next.addEventListener('click', () => {
                totalBalls += sessionBalls;
                localStorage.setItem('total_balls', String(totalBalls));
                localStorage.setItem("currentStation", nextStation);
                stopWebcam(); // Stop webcam before navigating
                window.location.href = 'qr.html';
            });
            controls.appendChild(next);
        }
    }

    async function startWebcam() {
        const videoElement = document.getElementById('webcam-feed');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30, max: 30 }
                },
                audio: false
            });
            videoElement.srcObject = stream;
            currentWebcamStream = stream;
        } catch (err) {
            console.error("Error accessing webcam: ", err);
            // document.getElementById('camera-access-required').style.display = 'block';
        }
    }
    
    function stopWebcam() {
        if (currentWebcamStream) {
            currentWebcamStream.getTracks().forEach(track => track.stop());
            currentWebcamStream = null;
        }
    }
    
    
    function applyChromaKey(videoElement) {
        if (isAndroid || !ctx || !canvas || !videoElement.videoWidth) return;
        
        canvas.width = videoContainer.offsetWidth;
        canvas.height = videoContainer.offsetHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cropPercent = 0.15;
        const sx = 0;
        const sy = videoElement.videoHeight * cropPercent;
        const sWidth = videoElement.videoWidth;
        const sHeight = videoElement.videoHeight * (1 - cropPercent);

        const videoRatio = sWidth / sHeight;
        const canvasRatio = canvas.width / canvas.height;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (videoRatio > canvasRatio) {
            drawWidth = canvas.width;
            drawHeight = drawWidth / videoRatio;
            offsetX = 0;
            offsetY = (canvas.height - drawHeight) / 2;
        } else {
            drawHeight = canvas.height;
            drawWidth = drawHeight * videoRatio;
            offsetY = 0;
            offsetX = (canvas.width - drawWidth) / 2;
        }

        ctx.drawImage(videoElement, sx, sy, sWidth, sHeight, offsetX, offsetY, drawWidth, drawHeight);
        try {
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = frame.data;
            const threshold = stationNumber == 2 ? 22 : 25;
            const maxGreen = 180;
            for (let i = 0; i < d.length; i += 4) {
                const r = d[i];
                const g = d[i + 1];
                const b = d[i + 2];

                if (b > r + threshold && b > g + threshold && g < maxGreen) {
                    d[i + 3] = 0;
                }
            }
            ctx.putImageData(frame, 0, 0);
        } catch (e) {
            console.error("Chroma key error:", e);
        }
    }
    
    function renderLoop() {
        if (activeVideo && !activeVideo.paused && !activeVideo.ended) {
            if (!isAndroid) {
                applyChromaKey(activeVideo);
            }
        }
        requestAnimationFrame(renderLoop);
    }
    startBtn.style.display = "none";
    document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    if (isAndroid) {
        canvas.style.display = 'none';
    } else {
        ctx = canvas.getContext('2d');
    }
    
    video1.src = getPlatformVideoSrc(waitingVideo);
    activeVideo = video1;

    function videoEndedCallback(videoElement) {
        const videoSource = decodeURIComponent(videoElement.currentSrc || "");
        if (videoSource.includes(introVideo.replace(".mp4", ""))) {
            startBtn.style.display = "block";
        }
        if (videoSource.includes(wrongStationVideo.replace(".mp4", ""))) {
            const wrongBtn = document.getElementById("wrongStationBtn");
            if(wrongBtn) wrongBtn.style.display = "block";
        }
        if (onLastQuestion && newStationVideo && videoSource.includes(correctAnswerVideo.replace(".mp4", ""))) {
            onLastQuestion = false;
            // Set flag and play newStationVideo, its 'ended' event will be caught by videoEndedCallback
            shouldShowNextButtonAfterNewStationVideo = true;
            playVideo(newStationVideo, false, true);
            return;
        }

        // If the video that just ended (or is near end) is the one that should create the "Далее" button
        if (shouldShowNextButtonAfterNewStationVideo && videoSource.includes(newStationVideo.replace(".mp4", ""))) {
            shouldShowNextButtonAfterNewStationVideo = false; // Reset flag
            if (!videoElement.loop) {
                playVideo(waitingVideo, true);
            }
            const nextBtn = document.createElement('button');
            nextBtn.className = 'primary';
            nextBtn.textContent = 'Далее';
            nextBtn.addEventListener('click', finishQuiz);
            controls.innerHTML = '';
            controls.appendChild(nextBtn);
            // The general !videoElement.loop fallback will now handle playing waitingVideo
        }
        if (!videoElement.loop) {
            playVideo(waitingVideo, true);
        }
    }

    [video1, video2].forEach(v => {
        v.addEventListener('ended', function () {
            videoEndedCallback(this);
        });
    });

    soundStartBtn.addEventListener("click", () => {
        [...document.querySelectorAll("video")].forEach(v => v.muted = false);
        soundOverlay.style.display = "none";
        playVideo(introVideo, false);
    });

    const currentFile = window.location.pathname.split('/').pop();
    let expectedStation = localStorage.getItem('currentStation');
let tr = false
    if (currentFile !== expectedStation && expectedStation && tr) {
        interactionPopup.style.display = 'flex';
        interactionBtn.onclick = () => {
            interactionPopup.style.display = 'none';
            handleWrongStation();
        };
    } else {
        setupQuiz();
    }

    function handleVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            if (activeVideo && !activeVideo.paused) {
                activeVideo.pause();
            }
        } else { // 'visible'
            if (activeVideo) {
                // If the video was paused and should resume
                if (activeVideo.paused) {
                    activeVideo.play().catch(e => console.error("Video play failed on visibility change:", e));
                }

                // More robust check for video completion, in case .ended is unreliable
                const isVideoNearEnd = activeVideo.duration > 0 && (activeVideo.duration - activeVideo.currentTime < 0.5); // within 0.5 seconds of end

                if (activeVideo.ended || isVideoNearEnd) {
                    // Trigger the ended logic if it ended while hidden or is very near end
                    videoEndedCallback(activeVideo);

                    // Explicitly check and create the "Далее" button if newStationVideo finished while hidden
                    // and the flag indicates it should be shown
                    if (shouldShowNextButtonAfterNewStationVideo && activeVideo.currentSrc.includes(newStationVideo.replace(".mp4", ""))) {
                        // Check if the button actually exists to avoid duplicates
                        if (!document.querySelector('#controls .primary')) {
                            shouldShowNextButtonAfterNewStationVideo = false; // Reset flag as button is being created
                            const nextBtn = document.createElement('button');
                            nextBtn.className = 'primary';
                            nextBtn.textContent = 'Далее';
                            nextBtn.addEventListener('click', finishQuiz);
                            controls.innerHTML = ''; // Clear existing controls
                            controls.appendChild(nextBtn);
                        }
                    }
                }
            }
        }
    }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        window.addEventListener('pagehide', stopWebcam); // Add pagehide listener

        startWebcam();
    renderLoop();
}
