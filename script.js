// Elemen DOM
const modelSelect = document.getElementById('model-select');
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const loadingIndicator = document.getElementById('loading-indicator');

// Array kosong untuk menyimpan riwayat obrolan
let chatHistory = []; 

// [BARU] Fungsi dinamis untuk mengambil daftar model langsung dari Puter AI
async function loadModels() {
    try {
        // Meminta Puter untuk memberikan daftar semua model yang tersedia
        const models = await puter.ai.models();
        
        // Mengosongkan dropdown agar bersih sebelum diisi
        modelSelect.innerHTML = '';
        
        // Memasukkan setiap model ke dalam dropdown
        models.forEach(model => {
            const option = document.createElement('option');
            // Menjadikan id/nama model sebagai value untuk dikirim ke API
            option.value = model.id || model.name; 
            // Menampilkan nama model di layar
            option.textContent = model.name || model.id;
            modelSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Gagal memuat daftar model:", error);
        // Fallback (cadangan) jika internet sedang bermasalah atau API gagal
        modelSelect.innerHTML = '<option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Default)</option>';
    }
}

// Fungsi untuk Menangani Error [object Object]
function parseAIResponse(response) {
    if (typeof response === 'object' && response !== null) {
        if (response.text) return response.text;
        if (response.message) return response.message;
        if (response.content) return response.content; 
        
        return `<pre style="white-space: pre-wrap;">${JSON.stringify(response, null, 2)}</pre>`;
    }
    return String(response);
}

// Fungsi untuk menambahkan pesan ke UI
function appendMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
    messageDiv.innerHTML = text; 
    chatBox.appendChild(messageDiv);
    
    // Auto-scroll ke bawah
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Logika Mengirim Pesan
async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return; 

    appendMessage(text, 'user');
    userInput.value = ''; 

    chatHistory.push({ role: 'user', content: text });

    loadingIndicator.style.display = 'block';
    const selectedModel = modelSelect.value;

    try {
        const response = await puter.ai.chat(chatHistory, { model: selectedModel });
        const cleanResponse = parseAIResponse(response);
        
        chatHistory.push({ role: 'assistant', content: cleanResponse });

        loadingIndicator.style.display = 'none';
        appendMessage(cleanResponse, 'bot');

    } catch (error) {
        loadingIndicator.style.display = 'none';
        appendMessage(`Maaf, terjadi kesalahan: ${error.message}`, 'bot');
        chatHistory.pop(); 
    }
}

// Event Listeners
sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});

// [BARU] Menjalankan fungsi loadModels saat pertama kali web dibuka
window.onload = () => {
    loadModels();
};