document.addEventListener('DOMContentLoaded', () => {

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
    const fileList = document.getElementById('file-list');

    // Authentication Logic
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.submitter?.setAttribute('disabled', true);
            e.preventDefault();
            const pin = pinInput.value;

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
                    authError.textContent = data.error || 'Authentication failed';
                    pinInput.value = '';
                }
            } catch (err) {
                authError.textContent = 'Network error occurred';
            } finally {
                e.submitter?.removeAttribute('disabled');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/logout', { method: 'POST' });
            window.location.reload();
        });
    }

    // Dashboard Logic
    if (dropZone) {
        loadFiles();

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('dragover');
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                handleUpload(files[0]);
            }
        });

        fileUpload.addEventListener('change', function () {
            if (this.files.length > 0) {
                handleUpload(this.files[0]);
            }
        });
    }

    function handleUpload(file) {
        uploadStatus.className = 'status-msg';
        uploadStatus.textContent = 'Initiating upload...';
        progressBarContainer.classList.remove('hidden');
        progressBar.style.width = '0%';

        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true);

        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBar.style.width = percentComplete + '%';
            }
        };

        xhr.onload = function () {
            if (xhr.status === 200) {
                uploadStatus.textContent = 'Upload complete!';
                uploadStatus.classList.add('success');
                setTimeout(() => {
                    progressBarContainer.classList.add('hidden');
                    uploadStatus.textContent = '';
                }, 3000);
                loadFiles(); // Refresh file list
            } else {
                let errorMsg = 'Upload failed';
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.error) errorMsg = response.error;
                } catch (e) { }
                uploadStatus.textContent = errorMsg;
                uploadStatus.style.color = 'var(--error)';
            }
        };

        xhr.onerror = function () {
            uploadStatus.textContent = 'Network Error during upload';
            uploadStatus.style.color = 'var(--error)';
        };

        xhr.send(formData);
    }

    async function loadFiles() {
        if (!fileList) return;

        try {
            const response = await fetch('/files');
            if (response.status === 401) {
                // Not authenticated
                return;
            }
            const data = await response.json();
            fileList.innerHTML = '';

            if (data.length === 0) {
                fileList.innerHTML = '<li style="justify-content: center; color: var(--text-muted); padding: 1rem; border: dashed 1px rgba(255,255,255,0.2);">Vault is currently empty</li>';
                return;
            }

            data.forEach(file => {
                const d = new Date(file.uploaded_at);
                const dateStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                const li = document.createElement('li');
                li.style.cssText = 'display:flex; justify-content:space-between; align-items:center; border: 1px solid rgba(255,255,255,0.1); padding: 1rem; margin-bottom: 1rem; border-radius: 12px;';
                li.innerHTML = `
                    <div class="file-info">
                        <span class="file-name mil-bold" title="${file.filename}">${file.filename}</span><br/>
                        <span class="file-date mil-muted mil-text-sm">${dateStr}</span>
                    </div>
                    <a href="/download/${file.id}" class="mil-button mil-icon-button-sm mil-arrow-place" title="Download">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 20H19V18H5V20ZM19 9H15V3H9V9H5L12 16L19 9Z" fill="currentColor"/>
                        </svg>
                    </a>
                `;
                fileList.appendChild(li);
            });
        } catch (err) {
            fileList.innerHTML = '<li style="color: red;">Error fetching files</li>';
        }
    }
});
