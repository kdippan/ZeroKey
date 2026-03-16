// DOM Elements
const statusText = document.getElementById('statusText');
const messagesContainer = document.getElementById('messagesContainer');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const generateKeysBtn = document.getElementById('generateKeysBtn');
const typingIndicator = document.getElementById('typingIndicator'); // New element

const roomId = window.location.hash.substring(1) || 'secure-lobby';
let myClientId = crypto.randomUUID(); 
let roomChannel;

// Cryptography & State
let myKeyPair = null;
let sharedAesKey = null;
let amITyping = false;
let typingTimeout = null;

// --- CRYPTOGRAPHY & SERIALIZATION HELPERS ---

function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) { binary += String.fromCharCode(bytes[i]); }
    return window.btoa(binary);
}

function base64ToBuffer(base64) {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
    return bytes.buffer;
}

// 1. Generate ECDH Public/Private Key Pair
async function generateIdentityKeys() {
    myKeyPair = await window.crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]
    );
    const exportedPubKey = await window.crypto.subtle.exportKey("raw", myKeyPair.publicKey);
    
    await roomChannel.send({
        type: 'broadcast',
        event: 'key-exchange',
        payload: { senderId: myClientId, publicKey: bufferToBase64(exportedPubKey) }
    });
    
    statusText.innerHTML = `<i class="ph-fill ph-spinner animate-spin text-indigo-400 text-lg"></i> Waiting for peer's public key...`;
    generateKeysBtn.classList.add('hidden');
}

// 2. Derive the Shared AES-GCM Key
async function deriveSharedSecret(peerPublicKeyBase64) {
    const peerPublicKey = await window.crypto.subtle.importKey(
        "raw", base64ToBuffer(peerPublicKeyBase64), { name: "ECDH", namedCurve: "P-256" }, true, []
    );

    sharedAesKey = await window.crypto.subtle.deriveKey(
        { name: "ECDH", public: peerPublicKey }, myKeyPair.privateKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
    );

    statusText.innerHTML = `<i class="ph-fill ph-shield-check text-emerald-400 text-lg"></i> AES-256 Tunnel Secured`;
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.placeholder = "Type a secure message...";
    messageInput.focus();
}

// 3. Encrypt & Decrypt
async function encryptMessage(text) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv }, sharedAesKey, new TextEncoder().encode(text)
    );
    return { ciphertext: bufferToBase64(ciphertextBuffer), iv: bufferToBase64(iv) };
}

async function decryptMessage(ciphertextBase64, ivBase64) {
    try {
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: base64ToBuffer(ivBase64) }, sharedAesKey, base64ToBuffer(ciphertextBase64)
        );
        return new TextDecoder().decode(decryptedBuffer);
    } catch (e) { return "⚠️ [Decryption Failed - Keys do not match]"; }
}

// --- NETWORK INITIALIZATION ---

async function initChat() {
    try {
        const configResponse = await fetch('/api/getConfig');
        const config = await configResponse.json();
        const supabase = window.supabase.createClient(config.url, config.anonKey);

        roomChannel = supabase.channel(`room:${roomId}`, { config: { broadcast: { self: false } } });

        // Handle Handshakes
        roomChannel.on('broadcast', { event: 'key-exchange' }, async (payload) => {
            if (payload.payload.senderId === myClientId) return;
            if (!myKeyPair) await generateIdentityKeys();
            await deriveSharedSecret(payload.payload.publicKey);
        });

        // Handle Incoming Messages
        roomChannel.on('broadcast', { event: 'secure-message' }, async (payload) => {
            if (payload.payload.senderId === myClientId) return;
            
            // Hide typing indicator immediately when message arrives
            typingIndicator.classList.add('hidden');

            if (!sharedAesKey) return renderMessage("⚠️ [Encrypted message received, but AES channel is not secure]", false);
            
            const decryptedText = await decryptMessage(payload.payload.ciphertext, payload.payload.iv);
            renderMessage(decryptedText, false);
        });

        // NEW: Handle Typing Events
        roomChannel.on('broadcast', { event: 'typing' }, (payload) => {
            if (payload.payload.senderId === myClientId) return;
            
            if (payload.payload.isTyping) {
                typingIndicator.classList.remove('hidden');
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } else {
                typingIndicator.classList.add('hidden');
            }
        });

        roomChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                statusText.innerHTML = `<i class="ph-fill ph-check-circle text-emerald-400 text-lg"></i> Room Connected. Handshake required.`;
                generateKeysBtn.classList.remove('hidden');
                generateKeysBtn.addEventListener('click', generateIdentityKeys);
            }
        });
    } catch (error) { statusText.innerHTML = `<i class="ph-fill ph-warning text-red-400 text-lg"></i> Failed to load config.`; }
}

// --- UI & TYPING INTERACTIONS ---

// Listen to keystrokes for typing indicator
messageInput.addEventListener('input', async () => {
    if (!sharedAesKey) return; // Don't broadcast if not secure yet

    // Send "Typing = true" only once when we start
    if (!amITyping) {
        amITyping = true;
        await roomChannel.send({ type: 'broadcast', event: 'typing', payload: { senderId: myClientId, isTyping: true } });
    }

    // Reset the timer every time a key is pressed
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(async () => {
        amITyping = false;
        await roomChannel.send({ type: 'broadcast', event: 'typing', payload: { senderId: myClientId, isTyping: false } });
    }, 1500); // Waits 1.5 seconds after last keystroke to hide indicator
});

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawText = messageInput.value.trim();
    if (!rawText || !sharedAesKey) return;

    // Immediately stop the typing indicator when we send
    clearTimeout(typingTimeout);
    amITyping = false;
    await roomChannel.send({ type: 'broadcast', event: 'typing', payload: { senderId: myClientId, isTyping: false } });

    renderMessage(rawText, true);
    messageInput.value = '';

    const encryptedData = await encryptMessage(rawText);
    await roomChannel.send({
        type: 'broadcast',
        event: 'secure-message',
        payload: { senderId: myClientId, ciphertext: encryptedData.ciphertext, iv: encryptedData.iv }
    });
});

function renderMessage(text, isMe) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `flex w-full ${isMe ? 'justify-end' : 'justify-start'}`;
    const bubble = document.createElement('div');
    bubble.className = `max-w-[75%] p-3 rounded-2xl text-sm font-mono break-words ${
        isMe ? 'bg-indigo-600 text-white rounded-tr-sm shadow-[0_0_15px_rgba(79,70,229,0.2)]' : 'bg-slate-800 text-emerald-300 border border-slate-700 rounded-tl-sm'
    }`;
    bubble.innerText = text;
    msgDiv.appendChild(bubble);
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

initChat();
