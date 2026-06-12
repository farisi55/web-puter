// ===== DOM ELEMENTS =====
const chatMessages = document.getElementById('chat-messages');
const chatContainer = document.getElementById('chat-container');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('btn-send');
const inputForm = document.getElementById('input-form');
const modelSelector = document.getElementById('model-selector');
const welcomeScreen = document.getElementById('welcome-screen');
const clearBtn = document.getElementById('btn-clear');

// ===== STATE =====
let conversationHistory = [];
let isGenerating = false;

// ===== LOAD MODELS (DYNAMIC) =====
async function loadModels() {
    try {
        const models = await puter.ai.listModels();

        // Sort: popular providers first, then alphabetical
        const providerOrder = ['openai', 'anthropic', 'google', 'meta', 'mistral', 'deepseek', 'xai'];

        // Group by provider
        const grouped = {};
        models.forEach(m => {
            const id = m.id || m.name || m;
            const provider = typeof id === 'string' ? id.split('/')[0] : 'other';
            if (!grouped[provider]) grouped[provider] = [];
            grouped[provider].push(id);
        });

        // Sort providers
        const sortedProviders = Object.keys(grouped).sort((a, b) => {
            const ia = providerOrder.indexOf(a);
            const ib = providerOrder.indexOf(b);
            if (ia !== -1 && ib !== -1) return ia - ib;
            if (ia !== -1) return -1;
            if (ib !== -1) return 1;
            return a.localeCompare(b);
        });

        modelSelector.innerHTML = '';

        sortedProviders.forEach(provider => {
            const group = document.createElement('optgroup');
            group.label = provider.charAt(0).toUpperCase() + provider.slice(1);

            grouped[provider].sort().forEach(modelId => {
                const opt = document.createElement('option');
                opt.value = modelId;
                // Show short name (remove provider prefix)
                const shortName = modelId.includes('/') ? modelId.split('/').slice(1).join('/') : modelId;
                opt.textContent = shortName;
                group.appendChild(opt);
            });

            modelSelector.appendChild(group);
        });

        // Set default model
        const preferredDefaults = ['openai/gpt-4o-mini', 'openai/gpt-4o', 'gpt-4o-mini', 'claude-3-haiku'];
        let defaultSet = false;
        for (const def of preferredDefaults) {
            const opt = modelSelector.querySelector(`option[value="${def}"]`);
            if (opt) {
                modelSelector.value = def;
                defaultSet = true;
                break;
            }
        }
        if (!defaultSet && modelSelector.options.length > 0) {
            modelSelector.selectedIndex = 0;
        }

        console.log(`✅ Loaded ${models.length} models`);

    } catch (err) {
        console.error('Failed to load models:', err);
        modelSelector.innerHTML = '<option value="gpt-4o-mini">gpt-4o-mini (fallback)</option>';
    }
}

loadModels();

// ===== MARKDOWN PARSER (lightweight) =====
function parseMarkdown(text) {
    if (typeof text !== 'string') return String(text);

    let html = text
        // Escape HTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

        // Code blocks (```lang\n...\n```)
        .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
            return `<pre><code class="lang-${lang || 'text'}">${code.trim()}</code></pre>`;
        })

        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')

        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')

        // Headers
        .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')

        // Blockquote
        .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')

        // Horizontal rule
        .replace(/^---$/gm, '<hr>')

        // Unordered list
        .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')

        // Ordered list
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')

        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')

        // Paragraphs (double newline)
        .replace(/\n\n/g, '</p><p>')

        // Single newline → <br>
        .replace(/\n/g, '<br>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*?<\/li>\s*(?:<br>)?)+)/g, '<ul>$1</ul>');
    html = html.replace(/<br><\/ul>/g, '</ul>');
    html = html.replace(/<ul><br>/g, '<ul>');

    return `<p>${html}</p>`.replace(/<p><\/p>/g, '');
}

// ===== EXTRACT TEXT FROM RESPONSE =====
function extractResponseText(response) {
    // Case 1: Simple string
    if (typeof response === 'string') return response;

    // Case 2: Has message.content (standard ChatResponse)
    if (response?.message?.content) {
        const content = response.message.content;
        if (typeof content === 'string') return content;
        // content is array (multimodal)
        if (Array.isArray(content)) {
            return content
                .filter(c => c.type === 'text')
                .map(c => c.text)
                .join('\n');
        }
        return JSON.stringify(content, null, 2);
    }

    // Case 3: Has text property directly
    if (typeof response?.text === 'string') return response.text;

    // Case 4: Has content directly
    if (typeof response?.content === 'string') return response.content;

    // Case 5: Deeply nested or unknown object — return null to signal object render
    if (typeof response === 'object' && response !== null) {
        return null;
    }

    return String(response);
}

// ===== RENDER OBJECT AS COLLAPSIBLE =====
function renderObjectResponse(obj) {
    const json = JSON.stringify(obj, null, 2);
    const id = 'obj-' + Date.now();
    return `
        <p>Response berupa objek:</p>
        <button class="obj-toggle" onclick="toggleObj('${id}', this)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            Lihat detail response
        </button>
        <div class="obj-detail" id="${id}">
            <pre><code>${json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
        </div>
    `;
}

window.toggleObj = function (id, btn) {
    const el = document.getElementById(id);
    el.classList.toggle('show');
    btn.classList.toggle('open');
    const label = el.classList.contains('show') ? 'Sembunyikan detail' : 'Lihat detail response';
    // Update text node
    const textNodes = Array.from(btn.childNodes).filter(n => n.nodeType === 3);
    if (textNodes.length) {
        textNodes[textNodes.length - 1].textContent = '\n            ' + label + '\n        ';
    }
};

// ===== SCROLL HELPER =====
function scrollToBottom() {
    requestAnimationFrame(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });
}

// ===== ADD MESSAGE TO UI =====
function addMessage(role, text, model = null) {
    welcomeScreen.style.display = 'none';

    const row = document.createElement('div');
    row.className = `message-row ${role}`;

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = role === 'user' ? '👤' : '✦';

    const content = document.createElement('div');
    content.className = 'msg-content';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';

    if (role === 'user') {
        bubble.textContent = text;
    } else {
        bubble.innerHTML = parseMarkdown(text);
    }

    content.appendChild(bubble);

    // Meta info for assistant messages
    if (role === 'assistant' && model) {
        const meta = document.createElement('div');
        meta.className = 'msg-meta';
        const tag = document.createElement('span');
        tag.className = 'msg-model-tag';
        tag.textContent = model;
        const time = document.createElement('span');
        time.className = 'msg-time';
        time.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        meta.appendChild(tag);
        meta.appendChild(time);
        content.appendChild(meta);
    }

    row.appendChild(avatar);
    row.appendChild(content);
    chatMessages.appendChild(row);
    scrollToBottom();

    return bubble;
}

function addObjectMessage(obj, model) {
    welcomeScreen.style.display = 'none';

    const row = document.createElement('div');
    row.className = 'message-row assistant';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = '✦';

    const content = document.createElement('div');
    content.className = 'msg-content';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = renderObjectResponse(obj);

    content.appendChild(bubble);

    if (model) {
        const meta = document.createElement('div');
        meta.className = 'msg-meta';
        const tag = document.createElement('span');
        tag.className = 'msg-model-tag';
        tag.textContent = model;
        const time = document.createElement('span');
        time.className = 'msg-time';
        time.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        meta.appendChild(tag);
        meta.appendChild(time);
        content.appendChild(meta);
    }

    row.appendChild(avatar);
    row.appendChild(content);
    chatMessages.appendChild(row);
    scrollToBottom();
}

function addErrorMessage(text) {
    const row = document.createElement('div');
    row.className = 'message-row assistant';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = '⚠';

    const content = document.createElement('div');
    content.className = 'msg-content';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble error-bubble';
    bubble.textContent = text;

    content.appendChild(bubble);
    row.appendChild(avatar);
    row.appendChild(content);
    chatMessages.appendChild(row);
    scrollToBottom();
}

// ===== LOADING INDICATOR =====
function showLoading() {
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    row.id = 'loading-indicator';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = '✦';

    const content = document.createElement('div');
    content.className = 'msg-content';

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.innerHTML = `
        <div class="loading-dots">
            <span></span><span></span><span></span>
        </div>
    `;

    content.appendChild(bubble);
    row.appendChild(avatar);
    row.appendChild(content);
    chatMessages.appendChild(row);
    scrollToBottom();
}

function hideLoading() {
    const el = document.getElementById('loading-indicator');
    if (el) el.remove();
}

// ===== SEND MESSAGE =====
async function sendMessage(userText) {
    if (!userText.trim() || isGenerating) return;

    isGenerating = true;
    sendBtn.disabled = true;

    const selectedModel = modelSelector.value;

    // Add user message
    addMessage('user', userText);
    conversationHistory.push({ role: 'user', content: userText });

    // Show loading
    showLoading();

    try {
        // Use streaming for real-time feel
        const response = await puter.ai.chat(conversationHistory, {
            model: selectedModel,
            stream: true,
        });

        hideLoading();

        // Check if response is iterable (stream)
        if (response && typeof response[Symbol.asyncIterator] === 'function') {
            // Streaming response
            welcomeScreen.style.display = 'none';

            const row = document.createElement('div');
            row.className = 'message-row assistant';

            const avatar = document.createElement('div');
            avatar.className = 'msg-avatar';
            avatar.textContent = '✦';

            const content = document.createElement('div');
            content.className = 'msg-content';

            const bubble = document.createElement('div');
            bubble.className = 'msg-bubble streaming-cursor';

            content.appendChild(bubble);

            const meta = document.createElement('div');
            meta.className = 'msg-meta';
            const tag = document.createElement('span');
            tag.className = 'msg-model-tag';
            tag.textContent = selectedModel;
            const time = document.createElement('span');
            time.className = 'msg-time';
            time.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
            meta.appendChild(tag);
            meta.appendChild(time);
            content.appendChild(meta);

            row.appendChild(avatar);
            row.appendChild(content);
            chatMessages.appendChild(row);

            let fullText = '';

            for await (const chunk of response) {
                const part = chunk?.text || chunk?.message?.content || '';
                if (typeof part === 'string') {
                    fullText += part;
                    bubble.innerHTML = parseMarkdown(fullText);
                    scrollToBottom();
                }
            }

            bubble.classList.remove('streaming-cursor');
            bubble.innerHTML = parseMarkdown(fullText);

            conversationHistory.push({ role: 'assistant', content: fullText });

        } else {
            // Non-streaming response
            const text = extractResponseText(response);

            if (text !== null) {
                addMessage('assistant', text, selectedModel);
                conversationHistory.push({ role: 'assistant', content: text });
            } else {
                // Object response
                addObjectMessage(response, selectedModel);
                conversationHistory.push({ role: 'assistant', content: JSON.stringify(response) });
            }
        }

    } catch (err) {
        hideLoading();
        console.error('Chat error:', err);
        const errMsg = err?.message || err?.toString() || 'Terjadi kesalahan, silakan coba lagi.';
        addErrorMessage(`Error: ${errMsg}`);
    } finally {
        isGenerating = false;
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

// ===== EVENT HANDLERS =====
inputForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (text) {
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendMessage(text);
    }
});

// Auto-resize textarea
chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
});

// Enter to send, Shift+Enter for newline
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        inputForm.dispatchEvent(new Event('submit'));
    }
});

// Clear chat
clearBtn.addEventListener('click', () => {
    conversationHistory = [];
    chatMessages.innerHTML = '';
    chatMessages.appendChild(welcomeScreen);
    welcomeScreen.style.display = '';
});

// Quick prompts
window.quickPrompt = function (text) {
    chatInput.value = text;
    sendMessage(text);
    chatInput.value = '';
};
