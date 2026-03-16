// --- DOM ELEMENTS ---
const lobbyView = document.getElementById('lobbyView');
const chatView = document.getElementById('chatView');
const authSection = document.getElementById('authSection');
const createRoomSection = document.getElementById('createRoomSection');
const joinRoomSection = document.getElementById('joinRoomSection');

// --- STATE ---
let supabase;
let currentUser = null;
let currentRoomId = null;
let masterAesKey = null;
let myDisplayName = "Creator";
let roomChannel;
let amITyping = false;
let typingTimeout = null;

// --- CRYPTO HELPERS ---
function bufferToBase64(buf) { return window.btoa(String.fromCharCode(...new Uint8Array(buf))); }
function base64ToBuffer(b64) { return new Uint8Array([...window.atob(b64)].map(c => c.charCodeAt(0))).buffer; }

async function deriveKeyFromPassword(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]);
    return await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
        keyMaterial, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
    );
}

async function generateRandomKey() {
    return await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

async function encryptData(text) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const cipher = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, masterAesKey, new TextEncoder().encode(text));
    return { ciphertext: bufferToBase64(cipher), iv: bufferToBase64(iv) };
}

async function decryptData(ciphertextB64, ivB64) {
    try {
        const plain = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBuffer(ivB64) }, masterAesKey, base64ToBuffer(ciphertextB64));
        return new TextDecoder().decode(plain);
    } catch (e) { return "⚠️ [Decryption Failed]"; }
}

// --- INITIALIZATION ---
async function initApp() {
    const config = await (await fetch('/api/getConfig')).json();
    supabase = window.supabase.createClient(config.url, config.anonKey);

    // Check Auth
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;
    document.getElementById('authStatus').innerText = currentUser ? `Logged in as ${currentUser.email}` : 'Guest Mode';

    // Route based on URL
    const hash = window.location.hash.substring(1);
    lobbyView.classList.remove('hidden');

    if (hash) {
        // Joining a room
        const parts = hash.split('|');
        currentRoomId = parts[0];
        const isUrlKey = parts.length > 1; // If key is in URL, it's an open room

        const { data: roomData } = await supabase.from('chat_rooms').select('room_name, is_protected').eq('id', currentRoomId).single();
        if (!roomData) return alert("Room not found or expired.");

        document.getElementById('joinRoomName').innerText = `Room: ${roomData.room_name}`;
        if (roomData.is_protected && !isUrlKey) document.getElementById('joinPasswordInput').classList.remove('hidden');
        
        authSection.classList.add('hidden');
        createRoomSection.classList.add('hidden');
        joinRoomSection.classList.remove('hidden');
    } else {
        // Creating a room
        if (currentUser) {
            authSection.classList.add('hidden');
            createRoomSection.classList.remove('hidden');
        } else {
            authSection.classList.remove('hidden');
            createRoomSection.classList.add('hidden');
        }
    }
}

// --- AUTH LOGIC ---
document.getElementById('signupBtn').onclick = async () => {
    const { error } = await supabase.auth.signUp({ email: emailInput.value, password: passwordInput.value });
    if (error) alert(error.message); else { alert("Account created! Logging in..."); location.reload(); }
};
document.getElementById('loginBtn').onclick = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email: emailInput.value, password: passwordInput.value });
    if (error) alert(error.message); else location.reload();
};

// --- CREATE ROOM ---
document.getElementById('createRoomBtn').onclick = async () => {
    const name = document.getElementById('newRoomName').value || "Secure Vault";
    const pwd = document.getElementById('newRoomPassword').value;
    const hours = parseInt(document.getElementById('retentionSelect').value);
    
    document.getElementById('createRoomBtn').innerHTML = `<i class="ph ph-spinner animate-spin"></i> Deploying...`;

    // 1. Insert to DB
    const { data, error } = await supabase.from('chat_rooms').insert([{
        room_name: name,
        is_protected: !!pwd,
        retention_hours: hours,
        expires_at: new Date(Date.now() + hours * 3600000).toISOString(),
        creator_id: currentUser.id
    }]).select().single();

    if (error) return alert("Error creating room.");

    // 2. Generate Cryptography
    let urlHash = `#${data.id}`;
    if (pwd) {
        masterAesKey = await deriveKeyFromPassword(pwd, data.id);
    } else {
        masterAesKey = await generateRandomKey();
        const exported = await window.crypto.subtle.exportKey("raw", masterAesKey);
        urlHash += `|${bufferToBase64(exported)}`;
    }

    window.history.replaceState(null, null, urlHash);
    myDisplayName = "Creator";
    currentRoomId = data.id;
    enterChat(name, pwd);
};

// --- JOIN ROOM ---
document.getElementById('joinRoomBtn').onclick = async () => {
    myDisplayName = document.getElementById('guestNameInput').value || "Guest_" + Math.floor(Math.random()*1000);
    const pwd = document.getElementById('joinPasswordInput').value;
    const parts = window.location.hash.substring(1).split('|');

    document.getElementById('joinRoomBtn').innerHTML = `<i class="ph ph-spinner animate-spin"></i> Decrypting...`;

    try {
        if (parts.length > 1) {
            // Open room: Key is in URL
            masterAesKey = await window.crypto.subtle.importKey("raw", base64ToBuffer(parts[1]), { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
        } else {
            // Protected room: Derive from password
            if (!pwd) throw new Error("Password required");
            masterAesKey = await deriveKeyFromPassword(pwd, currentRoomId);
        }
        
        const { data: roomData } = await supabase.from('chat_rooms').select('room_name').eq('id', currentRoomId).single();
        enterChat(roomData.room_name);
    } catch (e) {
        alert("Invalid Password or corrupted link.");
        document.getElementById('joinRoomBtn').innerText = "Enter Vault";
    }
};

// --- ENTER CHAT & LOAD HISTORY ---
async function enterChat(roomName, rawPwd = null) {
    lobbyView.classList.add('hidden');
    chatView.classList.remove('hidden');
    document.getElementById('chatRoomTitle').innerText = roomName;

    // Setup Invite Modal
    document.getElementById('shareUrl').value = window.location.href;
    if (rawPwd) {
        document.getElementById('sharePwdDisplay').classList.remove('hidden');
        document.getElementById('sharePwdDisplay').querySelector('span').innerText = rawPwd;
    }

    // 1. Fetch History
    const { data: history } = await supabase.from('chat_messages').select('*').eq('room_id', currentRoomId).order('created_at', { ascending: true });
    if (history) {
        for (const msg of history) {
            const plain = await decryptData(msg.ciphertext, msg.iv);
            renderMessage(plain, msg.sender_name, msg.sender_name === myDisplayName);
        }
    }

    // 2. Subscribe to new DB messages
    supabase.channel('public:chat_messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${currentRoomId}` }, async (payload) => {
            if (payload.new.sender_name === myDisplayName) return; // We render our own locally
            document.getElementById('typingIndicator').classList.add('hidden');
            const plain = await decryptData(payload.new.ciphertext, payload.new.iv);
            renderMessage(plain, payload.new.sender_name, false);
        }).subscribe();

    // 3. Subscribe to Realtime Typing Broadcasts
    roomChannel = supabase.channel(`typing:${currentRoomId}`);
    roomChannel.on('broadcast', { event: 'typing' }, (p) => {
        if (p.payload.sender === myDisplayName) return;
        document.getElementById('typingIndicator').classList.toggle('hidden', !p.payload.isTyping);
    }).subscribe();
}

// --- CHAT UI LOGIC ---
document.getElementById('chatForm').onsubmit = async (e) => {
    e.preventDefault();
    const text = document.getElementById('messageInput').value.trim();
    if (!text || !masterAesKey) return;

    document.getElementById('messageInput').value = '';
    renderMessage(text, myDisplayName, true);
    roomChannel.send({ type: 'broadcast', event: 'typing', payload: { sender: myDisplayName, isTyping: false } });

    const { ciphertext, iv } = await encryptData(text);
    await supabase.from('chat_messages').insert([{ room_id: currentRoomId, sender_name: myDisplayName, ciphertext, iv }]);
};

document.getElementById('messageInput').oninput = () => {
    if (!amITyping) { amITyping = true; roomChannel.send({ type: 'broadcast', event: 'typing', payload: { sender: myDisplayName, isTyping: true } }); }
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => { amITyping = false; roomChannel.send({ type: 'broadcast', event: 'typing', payload: { sender: myDisplayName, isTyping: false } }); }, 1500);
};

document.getElementById('inviteBtn').onclick = () => document.getElementById('inviteModal').classList.toggle('hidden');
document.getElementById('copyShareBtn').onclick = () => { navigator.clipboard.writeText(document.getElementById('shareUrl').value); document.getElementById('copyShareBtn').innerText = "Copied!"; };

function renderMessage(text, sender, isMe) {
    const c = document.getElementById('messagesContainer');
    const div = document.createElement('div');
    div.className = `flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`;
    div.innerHTML = `
        <span class="text-[10px] text-slate-500 mb-1 px-1">${sender}</span>
        <div class="max-w-[75%] p-3 rounded-2xl text-sm font-mono break-words ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-800 text-emerald-300 border border-slate-700 rounded-tl-sm'}">
            ${text}
        </div>`;
    c.appendChild(div);
    c.scrollTop = c.scrollHeight;
}

initApp();
