// DOM Elements
const statusText = document.getElementById('statusText');
const messagesContainer = document.getElementById('messagesContainer');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const generateKeysBtn = document.getElementById('generateKeysBtn');

const roomId = window.location.hash.substring(1) || 'secure-lobby';
let myClientId = crypto.randomUUID(); 
let roomChannel;

// Cryptography State
let myKeyPair = null;
let sharedAesKey = null;

// --- CRYPTOGRAPHY & SERIALIZATION HELPERS ---

function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToBuffer(base64) {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

// 1. Generate ECDH Public/Private Key Pair
async function generateIdentityKeys() {
    myKeyPair = await window.crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey"]
    );
    
    // Export Public Key to send to the other user
    const exportedPubKey = await window.crypto.subtle.exportKey("raw", myKeyPair.publicKey);
    const pubKeyBase64 = bufferToBase64(exportedPubKey);
    
    // Broadcast public key
    await roomChannel.send({
        type: 'broadcast',
        event: 'key-exchange',
        payload: { senderId: myClientId, publicKey: pubKeyBase64 }
    });
    
    statusText.innerHTML = `<i class="ph-fill ph-spinner animate-spin text-indigo-400 text-lg"></i> Waiting for peer's public key...`;
    generateKeysBtn.classList.add('hidden');
}

// 2. Derive the Shared AES-GCM Key
async function deriveSharedSecret(peerPublicKeyBase64) {
    const peerKeyBuffer = base64ToBuffer(peerPublicKeyBase64);
    const peerPublicKey = await window.crypto.subtle.importKey(
        "raw",
        peerKeyBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    );

    sharedAesKey = await window.crypto.subtle.deriveKey(
        { name: "ECDH", public: peerPublicKey },
        myKeyPair.privateKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );

    statusText.innerHTML = `<i class="ph-fill ph-shield-check text-emerald-400 text-lg"></i> AES-256 Tunnel Secured`;
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.placeholder = "Type a secure message...";
    messageInput.focus();
}

// 3. Encrypt Message
async function encryptMessage(text) {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        sharedAesKey,
        enc.encode(text)
    );
    return {
        ciphertext: bufferToBase64(ciphertextBuffer),
        iv: bufferToBase64(iv)
    };
}

// 4. Decrypt Message
async function decryptMessage(ciphertextBase64, ivBase64) {
    try {
        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: base64ToBuffer(ivBase64) },
            sharedAesKey,
            base64ToBuffer(ciphertextBase64)
        );
        return new TextDecoder().decode(decryptedBuffer);
    } catch (e) {
        return "⚠️ [Decryption Failed - Keys do not match]";
    }
}

// --- NETWORK INITIALIZATION ---

async function initChat() {
    try {
        const configResponse = await fetch('/api/getConfig');
        const config = await configResponse.json();
        const supabase = window.supabase.createClient(config.url, config.anonKey);

        roomChannel = supabase.channel(`room:${roomId}`, {
            config: { broadcast: { self: false } } // Set to false so we render our own messages locally instantly
        });

        // Handle Key Exchange
        roomChannel.on('broadcast', { event: 'key-exchange' }, async (payload) => {
            if (payload.payload.senderId === myClientId) return;
            
            // If we don't have keys yet, generate them to reply
            if (!myKeyPair) await generateIdentityKeys();
            
            // Derive the shared secret using their public key
            await deriveSharedSecret(payload.payload.publicKey);
        });

        // Handle Encrypted Messages
        roomChannel.on('broadcast', { event: 'secure-message' }, async (payload) => {
            if (payload.payload.senderId === myClientId) return;
            
            if (!sharedAesKey) {
                renderMessage("⚠️ [Encrypted message received, but AES channel is not secure]", false);
                return;
            }
            
            const decryptedText = await decryptMessage(payload.payload.ciphertext, payload.payload.iv);
            renderMessage(decryptedText, false);
        });

        roomChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                statusText.innerHTML = `<i class="ph-fill ph-check-circle text-emerald-400 text-lg"></i> Room Connected. Handshake required.`;
                generateKeysBtn.classList.remove('hidden');
                generateKeysBtn.addEventListener('click', generateIdentityKeys);
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                statusText.innerHTML = `<i class="ph-fill ph-warning text-red-400 text-lg"></i> Connection lost.`;
            }
        });

    } catch (error) {
        statusText.innerHTML = `<i class="ph-fill ph-warning text-red-400 text-lg"></i> Failed to load config.`;
    }
}

// --- UI INTERACTIONS ---

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawText = messageInput.value.trim();
    if (!rawText || !sharedAesKey) return;

    // Render locally immediately
    renderMessage(rawText, true);
    messageInput.value = '';

    // Encrypt and broadcast
    const encryptedData = await encryptMessage(rawText);
    
    await roomChannel.send({
        type: 'broadcast',
        event: 'secure-message',
        payload: {
            senderId: myClientId,
            ciphertext: encryptedData.ciphertext,
            iv: encryptedData.iv
        }
    });
});

function renderMessage(text, isMe) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `flex w-full ${isMe ? 'justify-end' : 'justify-start'}`;
    
    const bubble = document.createElement('div');
    bubble.className = `max-w-[75%] p-3 rounded-2xl text-sm font-mono break-words ${
        isMe 
        ? 'bg-indigo-600 text-white rounded-tr-sm shadow-[0_0_15px_rgba(79,70,229,0.2)]' 
        : 'bg-slate-800 text-emerald-300 border border-slate-700 rounded-tl-sm'
    }`;
    bubble.innerText = text;
    
    msgDiv.appendChild(bubble);
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

initChat();
