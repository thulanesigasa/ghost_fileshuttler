document.addEventListener('DOMContentLoaded', () => {
    // Prevent unwanted URL hash jumps on load
    if (window.location.hash) {
        history.replaceState("", document.title, window.location.pathname + window.location.search);
    }

    // Elements
    const authForm = document.getElementById('auth-form');
    const pinInput = document.getElementById('pin-input');
    const authError = document.getElementById('auth-error');
    const logoutBtn = document.getElementById('logout-btn');

    const dropZone = document.getElementById('drop-zone');
    const fileUpload = document.getElementById('file-upload');
    const progressBarContainer = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const uploadStatus = document.getElementById('upload-status');
    const uploadQueueContainer = document.getElementById('upload-queue-container');
    const fileList = document.getElementById('file-list');

    // Metrics Elements
    const metricFileCount = document.getElementById('metric-file-count');
    const metricStorageUsed = document.getElementById('metric-storage-used');
    const metricQuotaBar = document.getElementById('metric-quota-bar');

    // Search and Filter Elements
    const searchInput = document.getElementById('vault-search-input');
    const filterTabs = document.querySelectorAll('.filter-tab');

    let currentFilter = 'all';
    let currentSearch = '';
    let cachedFiles = [];

    // Audio Player State
    let currentAudio = null;
    let currentPlayingId = null;

    // Helper: Format Bytes
    function formatBytes(bytes, decimals = 1) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Helper: Format Seconds
    function formatSeconds(secs) {
        if (isNaN(secs)) return '0:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    // Authentication Logic
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = authForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.setAttribute('disabled', 'true');

            const pin = pinInput ? pinInput.value.trim() : '';

            try {
                const response = await fetch('/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin })
                });

                const data = await response.json();

                if (response.ok) {
                    window.location.reload();
                } else {
                    if (authError) authError.textContent = data.error || 'Authentication failed';
                    if (pinInput) pinInput.value = '';
                }
            } catch (err) {
                if (authError) authError.textContent = 'Connection error. Check host node status.';
            } finally {
                if (submitBtn) submitBtn.removeAttribute('disabled');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/logout', { method: 'POST' });
            window.location.reload();
        });
    }

    // Multi-File Upload Logic
    if (dropZone) {
        loadFiles();
        loadVaultStats();

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.style.borderColor = 'var(--accent)';
                dropZone.style.background = 'rgba(0, 195, 207, 0.08)';
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.style.borderColor = 'rgba(0, 195, 207, 0.25)';
                dropZone.style.background = 'rgba(0, 195, 207, 0.02)';
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                handleMultiUpload(files);
            }
        });

        if (fileUpload) {
            fileUpload.addEventListener('change', function () {
                if (this.files && this.files.length > 0) {
                    handleMultiUpload(this.files);
                }
            });
        }
    }

    function handleMultiUpload(files) {
        if (!files || files.length === 0) return;

        const fileArray = Array.from(files);
        uploadStatus.className = 'status-msg';
        uploadStatus.textContent = `Streaming ${fileArray.length} file(s) to vault...`;
        progressBarContainer.classList.remove('hidden');
        progressBar.style.width = '0%';

        if (uploadQueueContainer) {
            uploadQueueContainer.innerHTML = '';
            fileArray.forEach(f => {
                const item = document.createElement('div');
                item.className = 'queue-item';
                item.innerHTML = `<span>${f.name}</span> <span style="color:var(--accent); float:right;">${formatBytes(f.size)}</span>`;
                uploadQueueContainer.appendChild(item);
            });
        }

        const formData = new FormData();
        fileArray.forEach(f => {
            formData.append('files', f);
        });

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true);

        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = percent + '%';
                uploadStatus.textContent = `Transferring: ${percent}% of ${formatBytes(e.total)}`;
            }
        };

        xhr.onload = function () {
            if (xhr.status === 200) {
                uploadStatus.textContent = `Upload complete! Shuttled ${fileArray.length} file(s).`;
                setTimeout(() => {
                    progressBarContainer.classList.add('hidden');
                    uploadStatus.textContent = '';
                    if (uploadQueueContainer) uploadQueueContainer.innerHTML = '';
                }, 3000);
                loadFiles();
                loadVaultStats();
            } else {
                let errorMsg = 'Upload failed';
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.error) errorMsg = response.error;
                } catch (e) { }
                uploadStatus.textContent = errorMsg;
                uploadStatus.style.color = '#ff6b6b';
            }
        };

        xhr.onerror = function () {
            uploadStatus.textContent = 'Network Error during file transfer';
            uploadStatus.style.color = '#ff6b6b';
        };

        xhr.send(formData);
    }

    // Vault Stats Loader
    async function loadVaultStats() {
        if (!metricFileCount) return;
        try {
            const res = await fetch('/vault-stats');
            if (!res.ok) return;
            const stats = await res.json();

            metricFileCount.textContent = stats.total_files || 0;
            metricStorageUsed.textContent = formatBytes(stats.total_bytes || 0);

            if (metricQuotaBar && stats.quota_bytes) {
                const pct = Math.min(100, Math.max(1, ((stats.total_bytes / stats.quota_bytes) * 100)));
                metricQuotaBar.style.width = pct + '%';
            }
        } catch (err) {
            console.error('Stats error:', err);
        }
    }

    // Vault Files Loader with Filter & Audio Stem Player
    async function loadFiles() {
        if (!fileList || document.hidden) return;

        try {
            const response = await fetch('/files');
            if (response.status === 401) return;

            const data = await response.json();
            const currentJSON = JSON.stringify(data);

            if (window.lastFilesJSON === currentJSON && !window.forceRerender) return;
            window.lastFilesJSON = currentJSON;
            window.forceRerender = false;
            cachedFiles = data;

            renderFileList();
            loadVaultStats();
        } catch (err) {
            console.error('Ghost_FS Sync Error:', err);
        }
    }

    function renderFileList() {
        if (!fileList) return;

        const filtered = cachedFiles.filter(file => {
            const matchesSearch = file.filename.toLowerCase().includes(currentSearch.toLowerCase());
            if (!matchesSearch) return false;

            if (currentFilter === 'audio') return file.is_audio;
            if (currentFilter === 'docs') return !file.is_audio;
            return true;
        });

        fileList.innerHTML = '';

        if (filtered.length === 0) {
            fileList.innerHTML = '<li style="justify-content: center; color: var(--text-secondary); padding: 2rem; border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px; text-align: center;">Vault partition contains no matching stems or files</li>';
            return;
        }

        filtered.forEach(file => {
            const d = new Date(file.uploaded_at);
            const dateStr = `${d.toLocaleDateString()} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            const sizeStr = formatBytes(file.file_size);

            const li = document.createElement('li');
            li.style.cssText = 'background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); padding: 16px 20px; margin-bottom: 12px; border-radius: 14px; transition: border-color 0.2s;';

            let audioPlayerHtml = '';
            if (file.is_audio) {
                const isPlaying = (currentPlayingId === file.id);
                audioPlayerHtml = `
                    <div class="audio-stem-player" id="player-${file.id}">
                        <button type="button" class="play-pause-btn" onclick="togglePlayStem(${file.id})">
                            ${isPlaying ? `
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="6" y="4" width="4" height="16"></rect>
                                    <rect x="14" y="4" width="4" height="16"></rect>
                                </svg>
                            ` : `
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="margin-left: 2px;">
                                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                            `}
                        </button>
                        <div class="stem-timeline">
                            <div class="stem-meta-row">
                                <span class="stem-tag">AMAPIANO STEM</span>
                                <span id="time-${file.id}">0:00 / 0:00</span>
                            </div>
                            <div class="stem-waveform-track" onclick="seekStem(event, ${file.id})">
                                <div class="stem-progress-fill" id="progress-${file.id}"></div>
                            </div>
                        </div>
                    </div>
                `;
            }

            li.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                    <div style="min-width: 0; flex-grow: 1;">
                        <span class="file-name mil-bold" style="color: #fff; font-size: 14px; font-family: monospace; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${file.filename}">
                            ${file.filename}
                        </span>
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; font-family: monospace;">
                            <span>${sizeStr}</span> • <span>${dateStr}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-shrink: 0;">
                        <a href="/download/${file.id}" download="${file.filename}" class="vault-btn-sm" style="padding: 6px 12px;" title="Download Stem">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        </a>
                        <button type="button" onclick="deleteFile(${file.id}, '${file.filename}')" class="vault-btn-sm" style="padding: 6px 12px; color: #ff6b6b; border-color: rgba(255, 74, 74, 0.2);" title="Remove Stem">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                ${audioPlayerHtml}
            `;
            fileList.appendChild(li);
        });
    }

    // Audio Stem Playback Logic
    window.togglePlayStem = function (fileId) {
        if (currentPlayingId === fileId && currentAudio) {
            if (currentAudio.paused) {
                currentAudio.play();
            } else {
                currentAudio.pause();
            }
            window.forceRerender = true;
            renderFileList();
            return;
        }

        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        currentAudio = new Audio(`/stream/${fileId}`);
        currentPlayingId = fileId;

        currentAudio.addEventListener('timeupdate', () => {
            const timeEl = document.getElementById(`time-${fileId}`);
            const progEl = document.getElementById(`progress-${fileId}`);
            if (timeEl && currentAudio.duration) {
                timeEl.textContent = `${formatSeconds(currentAudio.currentTime)} / ${formatSeconds(currentAudio.duration)}`;
            }
            if (progEl && currentAudio.duration) {
                const pct = (currentAudio.currentTime / currentAudio.duration) * 100;
                progEl.style.width = pct + '%';
            }
        });

        currentAudio.addEventListener('ended', () => {
            currentPlayingId = null;
            window.forceRerender = true;
            renderFileList();
        });

        currentAudio.play();
        window.forceRerender = true;
        renderFileList();
    };

    window.seekStem = function (event, fileId) {
        if (!currentAudio || currentPlayingId !== fileId) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const pct = clickX / rect.width;
        if (currentAudio.duration) {
            currentAudio.currentTime = pct * currentAudio.duration;
        }
    };

    // Filter and Search Events
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.trim();
            renderFileList();
        });
    }

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.getAttribute('data-filter') || 'all';
            renderFileList();
        });
    });

    // Confirmation Modal Logic
    const ghostModal = document.getElementById('ghost-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalCancel = document.getElementById('modal-cancel');
    let modalAction = null;

    window.ghostAlert = function (message, isConfirm = false, action = null) {
        if (!ghostModal) return;
        modalMessage.innerHTML = message;
        modalAction = action;

        if (isConfirm) {
            modalCancel.classList.remove('hidden');
        } else {
            modalCancel.classList.add('hidden');
        }
        ghostModal.classList.remove('hidden');
    };

    window.deleteFile = function (fileId, filename) {
        ghostAlert(
            `Are you sure you want to permanently remove <br><span style="color:var(--accent); font-family:monospace;">"${filename}"</span> from the Ghost Vault?`,
            true,
            async () => {
                try {
                    const response = await fetch(`/delete/${fileId}`, {
                        method: 'POST',
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });
                    const data = await response.json();

                    if (response.ok) {
                        window.lastFilesJSON = "";
                        loadFiles();
                        loadVaultStats();
                    } else {
                        ghostAlert(data.error || 'Failed to delete file');
                    }
                } catch (err) {
                    ghostAlert('Network error during deletion.');
                }
            }
        );
    };

    if (modalCancel) {
        modalCancel.addEventListener('click', () => {
            ghostModal.classList.add('hidden');
            modalAction = null;
        });
    }

    if (modalConfirm) {
        modalConfirm.addEventListener('click', () => {
            ghostModal.classList.add('hidden');
            if (modalAction) modalAction();
            modalAction = null;
        });
    }

    // QR Code Modal Logic
    const qrModal = document.getElementById('qr-modal');
    const qrContainer = document.getElementById('qr-code-container');
    const qrUrlText = document.getElementById('qr-url-text');
    const headerQrBtn = document.getElementById('header-qr-btn');
    const dashboardQrBtn = document.getElementById('dashboard-qr-btn');
    const closeQrModalBtn = document.getElementById('close-qr-modal-btn');
    const copyQrUrlBtn = document.getElementById('copy-qr-url-btn');
    const copyQrLabel = document.getElementById('copy-qr-label');

    function openQRModal() {
        if (!qrModal) return;
        const currentUrl = window.location.origin;
        if (qrUrlText) qrUrlText.textContent = currentUrl;

        if (qrContainer && window.GhostQR) {
            qrContainer.innerHTML = window.GhostQR.render(currentUrl, 200, '#00c3cf', '#070a0f');
        }
        qrModal.classList.remove('hidden');
    }

    if (headerQrBtn) headerQrBtn.addEventListener('click', openQRModal);
    if (dashboardQrBtn) dashboardQrBtn.addEventListener('click', openQRModal);

    if (closeQrModalBtn) {
        closeQrModalBtn.addEventListener('click', () => {
            qrModal.classList.add('hidden');
        });
    }

    if (copyQrUrlBtn) {
        copyQrUrlBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(window.location.origin);
                if (copyQrLabel) {
                    copyQrLabel.textContent = 'Copied!';
                    setTimeout(() => { copyQrLabel.textContent = 'Copy URL'; }, 2000);
                }
            } catch (err) {
                // Fallback
            }
        });
    }

    // Interactive LAN Transfer Calculator Logic
    const calcRange = document.getElementById('calc-range');
    const calcSizeLabel = document.getElementById('calc-size-label');
    const calcTime2g = document.getElementById('calc-time-2g');
    const calcTime5g = document.getElementById('calc-time-5g');
    const calcTimeGig = document.getElementById('calc-time-gig');

    if (calcRange) {
        calcRange.addEventListener('input', (e) => {
            const mb = parseInt(e.target.value, 10);
            if (calcSizeLabel) {
                calcSizeLabel.textContent = `${mb} MB (Stem Pack)`;
            }

            // Approximate real-world effective LAN speeds:
            // 2.4G: ~35 Mbps = ~4.3 MB/s
            // 5G: ~380 Mbps = ~47.5 MB/s
            // Gigabit / Wi-Fi 6: ~850 Mbps = ~106 MB/s
            const s2g = mb / 4.3;
            const s5g = mb / 47.5;
            const sgig = mb / 106;

            function formatDuration(sec) {
                if (sec < 60) return `~ ${sec.toFixed(1)} sec`;
                return `~ ${(sec / 60).toFixed(1)} min`;
            }

            if (calcTime2g) calcTime2g.textContent = formatDuration(s2g);
            if (calcTime5g) calcTime5g.textContent = formatDuration(s5g);
            if (calcTimeGig) calcTimeGig.textContent = formatDuration(sgig);
        });
    }

    // FAQ Accordion Toggle Logic
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const header = item.querySelector('.faq-header');
        if (header) {
            header.addEventListener('click', () => {
                const wasActive = item.classList.contains('active');
                faqItems.forEach(i => i.classList.remove('active'));
                if (!wasActive) {
                    item.classList.add('active');
                }
            });
        }
    });

    // Real-Time Vault Synchronization (every 2 seconds)
    if (fileList) {
        setInterval(loadFiles, 2000);
    }
});
