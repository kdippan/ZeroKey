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

// Initialize the app by fetching Vercel Env Vars first
async function initChat() {
    try {
        // 1. Fetch the Supabase config from our Vercel API
        const configResponse = await fetch('/api/getConfig');
        const config = await configResponse.json();

        // 2. Initialize Supabase
        const supabase = window.supabase.createClient(config.url, config.anonKey);

        // 3. Initialize the Realtime Channel
        roomChannel = supabase.channel(`room:${roomId}`, {
            config: {
                broadcast: { self: true } // Allows us to see our own messages
            }
        });

        // 4. Listen for incoming broadcasts
        roomChannel.on('broadcast', { event: 'secure-message' }, (payload) => {
            console.log('Broadcast received:', payload);
            const isMe = payload.payload.senderId === myClientId;
            renderMessage(payload.payload.ciphertext, isMe);
        });

        // 5. Subscribe and open the WebSocket
        roomChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                statusText.innerHTML = `<i class="ph-fill ph-check-circle text-emerald-400 text-lg"></i> Secure Channel Established: <span class="font-mono text-emerald-300">${roomId}</span>`;
                messageInput.disabled = false;
                sendBtn.disabled = false;
                messageInput.placeholder = "Type an encrypted message...";
                generateKeysBtn.classList.remove('hidden');
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                statusText.innerHTML = `<i class="ph-fill ph-warning text-red-400 text-lg"></i> Connection lost.`;
                messageInput.disabled = true;
                sendBtn.disabled = true;
            }
        });

    } catch (error) {
        console.error("Failed to initialize secure chat:", error);
        statusText.innerHTML = `<i class="ph-fill ph-warning text-red-400 text-lg"></i> Failed to load secure configuration.`;
    }
}

// 6. Handle sending messages
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawText = messageInput.value.trim();
    if (!rawText || !roomChannel) return;

    // TODO: ECDH & AES-GCM encryption will happen right here.
    const mockCiphertext = `[ENCRYPTED] ${btoa(rawText)}`;

    // Blast the message over the WebSocket
    await roomChannel.send({
        type: 'broadcast',
        event: 'secure-message',
        payload: {
            senderId: myClientId,
            ciphertext: mockCiphertext,
            iv: "mock-iv-data"
        }
    });

    messageInput.value = '';
});

// UI Helper to draw chat bubbles
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

// Boot up the application
initChat();
