const fileInput = document.getElementById('file-input');
const promptInput = document.getElementById('prompt-input');
const promptCount = document.getElementById('prompt-count');
const generatorForm = document.getElementById('generator-form');
const generateButton = document.getElementById('generate-button');
const generateLabel = document.getElementById('generate-label');
const resultStage = document.getElementById('result-stage');
const resultLabel = document.getElementById('result-label');
const resultActions = document.getElementById('result-actions');
const resultFilename = document.getElementById('result-filename');
const downloadResult = document.getElementById('download-result');
const recentGrid = document.getElementById('recent-grid');
const libraryGrid = document.getElementById('library-grid');
const libraryCount = document.getElementById('library-count');
const librarySummary = document.getElementById('library-summary');
const toast = document.getElementById('toast');
const connectionStatus = document.getElementById('connection-status');
const connectionMark = document.querySelector('.connection-mark');

let activeMode = 'image';
let activeStyle = 'Foto realistis';
let isGenerating = false;
let isChatting = false;
let toastTimer;
const libraryItems = [];
const conversationHistory = [];

function setConnectionStatus(message, state = 'ready') {
    connectionStatus.textContent = message;
    connectionStatus.dataset.state = state;
    connectionMark.dataset.state = state;
}

function updateCount() {
    const count = libraryItems.length;
    libraryCount.textContent = count;
    librarySummary.textContent = `${count} item`;
}

function showToast(message, type = 'info') {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.dataset.type = type;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => {
        toast.hidden = true;
    }, 5000);
}

function setView(viewId) {
    const viewNames = {
        'creator-view': 'Buat konten',
        'chat-view': 'Chat AI',
        'library-view': 'Perpustakaan'
    };
    Object.keys(viewNames).forEach((id) => {
        document.getElementById(id).hidden = id !== viewId;
    });
    document.getElementById('page-context').textContent = viewNames[viewId];
    document.querySelectorAll('.nav-item').forEach((item) => {
        item.classList.toggle('is-active', item.dataset.view === viewId);
    });
}

document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => setView(item.dataset.view));
});
document.querySelectorAll('[data-open-library]').forEach((item) => {
    item.addEventListener('click', () => setView('library-view'));
});

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatForm = document.getElementById('chat-form');
const chatSend = document.getElementById('chat-send');
const chatModel = document.getElementById('chat-model');
const chatWelcome = document.getElementById('chat-welcome');

function scrollChatToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendChatMessage(role, text) {
    chatWelcome.hidden = true;
    const article = document.createElement('article');
    article.className = `chat-message ${role}`;
    const label = document.createElement('span');
    label.className = 'chat-message-label';
    label.textContent = role === 'user' ? 'Anda' : 'AI';
    const body = document.createElement('p');
    body.className = 'chat-message-body';
    body.textContent = text;
    article.append(label, body);
    chatMessages.append(article);
    scrollChatToBottom();
    return body;
}

function setChatLoading(loading) {
    isChatting = loading;
    chatSend.disabled = loading;
    chatInput.disabled = loading;
    chatSend.querySelector('span:first-child').textContent = loading ? 'Menjawab' : 'Kirim';
}

async function sendChatMessage(text) {
    const message = text.trim();
    if (!message || isChatting) return;
    if (!window.puter?.ai?.chat) {
        showToast('Fitur chat Puter tidak tersedia. Periksa koneksi lalu coba lagi.', 'error');
        return;
    }

    setChatViewForPending();
    appendChatMessage('user', message);
    conversationHistory.push({ role: 'user', content: message });
    setChatLoading(true);
    const responseBody = appendChatMessage('assistant', 'Sedang menyiapkan jawaban...');
    responseBody.classList.add('is-pending');

    try {
        const response = await window.puter.ai.chat(conversationHistory, {
            model: chatModel.value,
            stream: true
        });
        let answer = '';
        if (response && typeof response[Symbol.asyncIterator] === 'function') {
            for await (const part of response) {
                const content = part?.text || part?.message?.content || '';
                if (typeof content === 'string') {
                    answer += content;
                    responseBody.textContent = answer;
                    scrollChatToBottom();
                }
            }
        } else if (typeof response === 'string') {
            answer = response;
        } else if (typeof response?.message?.content === 'string') {
            answer = response.message.content;
        } else if (typeof response?.text === 'string') {
            answer = response.text;
        }

        if (!answer.trim()) {
            throw new Error('Model tidak mengembalikan teks. Coba lagi atau pilih model lain.');
        }
        responseBody.textContent = answer;
        conversationHistory.push({ role: 'assistant', content: answer });
    } catch (error) {
        console.error('Chat AI gagal:', error);
        responseBody.textContent = `Jawaban gagal dimuat: ${error?.message || 'Terjadi kesalahan. Silakan coba lagi.'}`;
        responseBody.classList.add('chat-error');
        conversationHistory.pop();
        showToast(error?.message || 'Chat AI gagal. Silakan coba lagi.', 'error');
    } finally {
        responseBody.classList.remove('is-pending');
        setChatLoading(false);
        chatInput.focus();
        scrollChatToBottom();
    }
}

function setChatViewForPending() {
    setView('chat-view');
}

chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = chatInput.value;
    if (!message.trim() || isChatting) return;
    chatInput.value = '';
    chatInput.style.height = 'auto';
    sendChatMessage(message);
});

chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 170)}px`;
});

chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        chatForm.requestSubmit();
    }
});

document.querySelectorAll('[data-chat-prompt]').forEach((button) => {
    button.addEventListener('click', () => sendChatMessage(button.dataset.chatPrompt));
});

document.getElementById('clear-chat').addEventListener('click', () => {
    if (isChatting) return;
    conversationHistory.length = 0;
    chatMessages.querySelectorAll('.chat-message').forEach((message) => message.remove());
    chatWelcome.hidden = false;
    chatInput.value = '';
    chatInput.focus();
});

async function loadChatModels() {
    if (!window.puter?.ai?.listModels) return;
    try {
        const models = await window.puter.ai.listModels();
        const modelIds = models
            .map((model) => model?.id || model?.name)
            .filter((id) => typeof id === 'string' && id.length > 0);
        if (!modelIds.length) return;

        const preferred = ['gpt-5.6-luna', 'gpt-4o-mini', 'gpt-4o'];
        modelIds.sort((a, b) => {
            const ai = preferred.indexOf(a);
            const bi = preferred.indexOf(b);
            if (ai !== -1 || bi !== -1) return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
            return a.localeCompare(b);
        });
        chatModel.replaceChildren();
        modelIds.forEach((id) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = id;
            chatModel.append(option);
        });
    } catch (error) {
        console.error('Daftar model chat tidak dapat dimuat:', error);
    }
}

loadChatModels();

document.querySelectorAll('.mode-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        activeMode = tab.dataset.mode;
        document.querySelectorAll('.mode-tab').forEach((item) => {
            const selected = item === tab;
            item.classList.toggle('is-selected', selected);
            item.setAttribute('aria-selected', String(selected));
        });
        const isVideo = activeMode === 'video';
        document.getElementById('image-options').hidden = isVideo;
        document.getElementById('video-options').hidden = !isVideo;
        generateLabel.textContent = isVideo ? 'Buat video' : 'Buat gambar';
        promptInput.placeholder = isVideo
            ? 'Contoh: Kamera bergerak perlahan menyusuri hutan pinus berkabut, dedaunan bergoyang tertiup angin, suasana tenang.'
            : 'Contoh: Rumah kecil di tepi danau saat pagi berkabut, cahaya matahari lembut, gaya fotografi sinematik.';
    });
});

document.querySelectorAll('.style-option').forEach((button) => {
    button.addEventListener('click', () => {
        activeStyle = button.dataset.style;
        document.querySelectorAll('.style-option').forEach((item) => {
            item.classList.toggle('is-selected', item === button);
        });
    });
});

promptInput.addEventListener('input', () => {
    promptCount.textContent = `${promptInput.value.length} / 1800`;
});

function safeFilename(name) {
    return name.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'file';
}

function getExtension(name) {
    return name.split('.').pop().toLowerCase();
}

function getFileKind(file) {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
}

function getFileBadge(item) {
    if (item.kind === 'image') return 'GAMBAR';
    if (item.kind === 'video') return 'VIDEO';
    return getExtension(item.name).toUpperCase() || 'FILE';
}

function renderLibrary() {
    updateCount();
    const recentItems = libraryItems.slice(-4).reverse();
    recentGrid.replaceChildren();
    libraryGrid.replaceChildren();

    if (libraryItems.length === 0) {
        const emptyRecent = document.createElement('p');
        emptyRecent.className = 'empty-library';
        emptyRecent.textContent = 'Hasil dan file yang Anda tambahkan akan muncul di sini.';
        recentGrid.append(emptyRecent);

        const emptyLibrary = document.createElement('p');
        emptyLibrary.className = 'empty-library';
        emptyLibrary.textContent = 'Belum ada file. Unggah file atau buat gambar pertama Anda.';
        libraryGrid.append(emptyLibrary);
        return;
    }

    recentItems.forEach((item) => recentGrid.append(createMediaCard(item, true)));
    libraryItems.slice().reverse().forEach((item) => libraryGrid.append(createMediaCard(item, false)));
}

function createMediaCard(item, compact) {
    const card = document.createElement('article');
    card.className = compact ? 'media-card compact-card' : 'media-card';
    const preview = document.createElement('div');
    preview.className = 'media-preview';

    if (item.kind === 'image' && item.url) {
        const image = document.createElement('img');
        image.src = item.url;
        image.alt = item.name;
        image.loading = 'lazy';
        preview.append(image);
    } else if (item.kind === 'video' && item.url) {
        const video = document.createElement('video');
        video.src = item.url;
        video.controls = true;
        video.preload = 'metadata';
        video.setAttribute('aria-label', item.name);
        preview.append(video);
    } else {
        const doc = document.createElement('div');
        doc.className = 'document-preview';
        const badge = document.createElement('span');
        badge.textContent = getFileBadge(item);
        const name = document.createElement('strong');
        name.textContent = item.name;
        doc.append(badge, name);
        preview.append(doc);
    }

    const details = document.createElement('div');
    details.className = 'media-details';
    const name = document.createElement('strong');
    name.textContent = item.name;
    const meta = document.createElement('span');
    meta.textContent = item.label;
    details.append(name, meta);
    card.append(preview, details);
    if (item.url && (item.kind === 'image' || item.kind === 'video')) {
        const link = document.createElement('a');
        link.className = 'card-download';
        link.href = item.url;
        link.download = item.name;
        link.textContent = 'Unduh';
        link.setAttribute('aria-label', `Unduh ${item.name}`);
        card.append(link);
    }
    return card;
}

function getMediaUrl(result) {
    if (typeof result === 'string') return result;
    if (result instanceof Blob) return URL.createObjectURL(result);
    if (result instanceof HTMLImageElement || result instanceof HTMLVideoElement) return result.currentSrc || result.src;
    if (result && typeof result === 'object') {
        for (const key of ['url', 'src', 'video_url', 'image_url']) {
            if (typeof result[key] === 'string' && result[key]) return result[key];
        }
        if (result.data instanceof Blob) return URL.createObjectURL(result.data);
    }
    return '';
}

function showEmptyResult(message, title = 'Mulai dari sebuah ide') {
    resultStage.replaceChildren();
    const empty = document.createElement('div');
    empty.className = 'empty-result';
    const art = document.createElement('div');
    art.className = 'empty-art';
    art.setAttribute('aria-hidden', 'true');
    art.innerHTML = '<span></span><span></span><span></span>';
    const heading = document.createElement('h3');
    heading.textContent = title;
    const copy = document.createElement('p');
    copy.textContent = message;
    empty.append(art, heading, copy);
    resultStage.append(empty);
    resultActions.hidden = true;
}

function setGeneratingState(isLoading) {
    isGenerating = isLoading;
    generateButton.disabled = isLoading;
    generateButton.classList.toggle('is-loading', isLoading);
    generateLabel.textContent = isLoading
        ? 'Sedang membuat...'
        : activeMode === 'video' ? 'Buat video' : 'Buat gambar';
    if (isLoading) {
        resultStage.innerHTML = '<div class="loading-result"><div class="skeleton-media"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div><p>Proses ini mungkin memerlukan waktu.</p></div>';
        resultActions.hidden = true;
        resultLabel.textContent = 'Sedang diproses';
    }
}

function showGeneratedResult(result, kind, prompt, filename) {
    const url = getMediaUrl(result);
    if (!url) {
        throw new Error('Puter tidak mengembalikan media yang dapat ditampilkan. Coba lagi atau gunakan model lain.');
    }

    resultStage.replaceChildren();
    const media = kind === 'video' ? document.createElement('video') : document.createElement('img');
    media.className = 'generated-media';
    media.src = url;
    media.controls = kind === 'video';
    media.alt = kind === 'image' ? prompt : '';
    if (kind === 'video') {
        media.playsInline = true;
        media.preload = 'metadata';
        media.setAttribute('aria-label', 'Video hasil generasi');
    }
    resultStage.append(media);
    resultFilename.textContent = filename;
    downloadResult.href = url;
    downloadResult.download = filename;
    resultActions.hidden = false;
    resultLabel.textContent = kind === 'video' ? 'Video siap diputar' : 'Gambar selesai dibuat';

    const item = {
        name: filename,
        kind,
        url,
        label: 'Hasil kreasi · Tersimpan di Puter',
        createdAt: Date.now()
    };
    libraryItems.push(item);
    renderLibrary();
}

generatorForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const prompt = promptInput.value.trim();
    if (!prompt || isGenerating) {
        if (!prompt) showToast('Tulis deskripsi sebelum mulai membuat.', 'error');
        return;
    }
    if (!window.puter?.ai) {
        showToast('Puter belum tersedia. Periksa koneksi internet lalu muat ulang halaman.', 'error');
        return;
    }

    const kind = activeMode;
    const extension = kind === 'video' ? 'mp4' : 'png';
    const filename = `puter-${kind}-${Date.now()}.${extension}`;
    setGeneratingState(true);
    try {
        let result;
        if (kind === 'image') {
            result = await window.puter.ai.txt2img(`${prompt}. Gaya visual: ${activeStyle}.`, {
                puter_output_path: filename
            });
        } else {
            result = await window.puter.ai.txt2vid(prompt, { puter_output_path: filename });
        }
        showGeneratedResult(result, kind, prompt, filename);
        showToast(`${kind === 'video' ? 'Video' : 'Gambar'} berhasil dibuat.`, 'success');
    } catch (error) {
        console.error('Pembuatan media gagal:', error);
        const detail = error?.message || 'Terjadi kesalahan saat membuat media.';
        showEmptyResult(detail, 'Belum berhasil dibuat');
        resultLabel.textContent = 'Proses gagal';
        showToast(detail, 'error');
    } finally {
        setGeneratingState(false);
    }
});

async function uploadFiles(files) {
    const selectedFiles = Array.from(files || []);
    if (!selectedFiles.length) return;
    if (!window.puter?.fs?.write) {
        showToast('Penyimpanan Puter tidak tersedia. Periksa koneksi internet lalu muat ulang halaman.', 'error');
        return;
    }

    setView('library-view');
    let uploadedCount = 0;
    const failedFiles = [];
    for (const file of selectedFiles) {
        const path = `puter-upload-${Date.now()}-${safeFilename(file.name)}`;
        try {
            const uploaded = await window.puter.fs.write(path, file);
            const localUrl = file.type.startsWith('image/') || file.type.startsWith('video/')
                ? URL.createObjectURL(file)
                : '';
            libraryItems.push({
                name: file.name,
                kind: getFileKind(file),
                url: localUrl,
                label: `Tersimpan di Puter${uploaded?.path ? ` · ${uploaded.path}` : ''}`,
                path: uploaded?.path || path
            });
            uploadedCount += 1;
        } catch (error) {
            console.error(`Unggah ${file.name} gagal:`, error);
            failedFiles.push(`${file.name}: ${error?.message || 'terjadi kesalahan.'}`);
        }
    }
    renderLibrary();
    if (failedFiles.length > 0) {
        const successfulMessage = uploadedCount > 0 ? `${uploadedCount} file berhasil. ` : '';
        showToast(`${successfulMessage}Gagal mengunggah ${failedFiles.join('; ')}`, 'error');
    } else if (uploadedCount === selectedFiles.length) {
        showToast(uploadedCount === 1 ? 'File berhasil diunggah ke Puter.' : `${uploadedCount} file berhasil diunggah ke Puter.`, 'success');
    }
}

document.getElementById('sidebar-upload').addEventListener('click', () => fileInput.click());
document.getElementById('library-upload').addEventListener('click', () => fileInput.click());
document.getElementById('upload-dropzone').addEventListener('click', () => fileInput.click());
document.getElementById('upload-dropzone').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        fileInput.click();
    }
});
fileInput.addEventListener('change', async () => {
    await uploadFiles(fileInput.files);
    fileInput.value = '';
});

const dropzone = document.getElementById('upload-dropzone');
['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.add('is-dragging');
    });
});
['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove('is-dragging');
    });
});
dropzone.addEventListener('drop', (event) => uploadFiles(event.dataTransfer.files));

window.addEventListener('dragover', (event) => event.preventDefault());
window.addEventListener('drop', (event) => event.preventDefault());

if (window.puter) {
    setConnectionStatus('Puter siap', 'ready');
} else {
    setConnectionStatus('Menunggu koneksi Puter', 'pending');
    window.addEventListener('load', () => {
        if (window.puter) {
            setConnectionStatus('Puter siap', 'ready');
        } else {
            setConnectionStatus('Puter tidak terhubung', 'error');
        }
    }, { once: true });
}

renderLibrary();
