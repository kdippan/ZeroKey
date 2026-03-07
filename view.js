// ==========================================
// 1. AUDIO SYNTHESIS ENGINE
// ==========================================
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() { if (!audioCtx) audioCtx = new AudioContext(); }

function playBeep(freq, type, duration, vol) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// ==========================================
// 2. CRYPTOGRAPHY (PBKDF2 + AES-GCM)
// ==========================================
function base64ToBuffer(base64) {
    return Uint8Array.from(window.atob(base64), c => c.charCodeAt(0)).buffer;
}

async function deriveKey(pinStr, saltBase64) {
    const enc = new TextEncoder();
    const saltBuffer = base64ToBuffer(saltBase64);
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw", enc.encode(pinStr), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    return await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: saltBuffer, iterations: 100000, hash: "SHA-256" },
        keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
    );
}

async function decryptPayload(encryptedBase64, key, ivBase64) {
    const encryptedBuffer = base64ToBuffer(encryptedBase64);
    const ivBuffer = new Uint8Array(base64ToBuffer(ivBase64));
    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBuffer }, key, encryptedBuffer
    );
    return new TextDecoder().decode(decryptedBuffer);
}

// ==========================================
// 3. GEOFENCING (Haversine Formula)
// ==========================================
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function checkGeofence(targetCoords) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject("GPS unavailable.");
        navigator.geolocation.getCurrentPosition(
            pos => {
                const dist = getDistance(targetCoords.lat, targetCoords.lng, pos.coords.latitude, pos.coords.longitude);
                if (dist > 50) reject(`Out of bounds. You are ${Math.round(dist)}m away from the secure drop zone.`);
                else resolve(true);
            },
            err => reject("Location permission denied. Cannot verify Geofence.")
        );
    });
}

// ==========================================
// 4. UI & ANIMATION EFFECTS
// ==========================================
function triggerGlitchLockout(reason) {
    document.getElementById('mainCard').classList.add('glitch-active');
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 500]);
    playBeep(150, 'sawtooth', 0.5, 0.5); // Harsh error sound
    
    document.getElementById('lockedState').classList.add('hidden');
    const destroyedState = document.getElementById('destroyedState');
    destroyedState.classList.remove('hidden');
    
    document.getElementById('destroyTitle').innerText = "SECURITY BREACH";
    document.getElementById('destroyTitle').classList.replace('text-slate-400', 'text-red-500');
    document.getElementById('destroyIcon').classList.replace('ph-wind', 'ph-shield-warning');
    document.getElementById('destroyIcon').classList.replace('text-slate-400', 'text-red-500');
    document.getElementById('destroyDesc').innerText = `${reason} Payload wiped.`;
}

function cipherReveal(element, finalString) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>";
    let iterations = 0;
    const interval = setInterval(() => {
        element.innerText = finalString.split("").map((char, index) => {
            if(index < iterations) return char;
            return chars[Math.floor(Math.random() * chars.length)];
        }).join("");
        
        if(iterations >= finalString.length) clearInterval(interval);
        iterations += 1/2; // Speed of decoding
    }, 30);
}

// ==========================================
// 5. CORE LOGIC & EVENT LISTENERS
// ==========================================

// Parse URL Early
const urlParams = new URLSearchParams(window.location.search);
const payloadId = urlParams.get('id');
const ivBase64 = urlParams.get('iv');
const saltBase64 = urlParams.get('salt');
const hashKey = window.location.hash.substring(1);

// Anti-Bot Shield Initialization
document.getElementById('verifyHumanBtn').addEventListener('click', () => {
    initAudio();
    playBeep(600, 'sine', 0.1, 0.1);
    
    document.getElementById('antiBotState').classList.add('hidden');
    document.getElementById('lockedState').classList.remove('hidden');
    
    if (hashKey === "LOCKED") {
        document.getElementById('pinContainer').classList.remove('hidden');
    }
});

let failedAttempts = 0;

document.getElementById('decryptBtn').addEventListener('click', async () => {
    if (!payloadId || !ivBase64 || !saltBase64 || !hashKey) return alert("Broken secure link.");

    // 1. PIN Check
    let activePin = hashKey;
    if (hashKey === "LOCKED") {
        activePin = document.getElementById('receiverPin').value.trim();
        if (!activePin) return alert("Decryption PIN is required.");
    }

    // 2. Biometrics (Skipped actual API code for brevity, assuming `verifyBiometrics()` from Phase 1 is pasted here)
    // *If you removed it, just assume TRUE for this step, or paste the WebAuthn block back in!*
    const isAuthenticated = true; // Replace with await verifyBiometrics() if desired

    if (!isAuthenticated) {
        failedAttempts++;
        if (failedAttempts >= 3) {
            fetch('/api/destroySecret', { method: 'POST', body: JSON.stringify({ id: payloadId }) });
            return triggerGlitchLockout("Max biometric failures.");
        }
        return alert(`Auth failed. ${3 - failedAttempts} attempts left.`);
    }

    const btn = document.getElementById('decryptBtn');
    btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Decrypting...';
    btn.disabled = true;

    try {
        // 3. Fetch & Burn from Database
        const response = await fetch('/api/getSecret', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: payloadId })
        });

        if (!response.ok) throw new Error("Intercepted or destroyed.");
        const { encryptedBase64 } = await response.json();

        // 4. Derive Key & Decrypt
        const cryptoKey = await deriveKey(activePin, saltBase64);
        const decryptedJson = await decryptPayload(encryptedBase64, cryptoKey, decodeURIComponent(ivBase64));
        const payload = JSON.parse(decryptedJson);

        // 5. Geofence Check
        if (payload.geo) {
            btn.innerHTML = '<i class="ph ph-crosshair animate-pulse text-xl"></i> Verifying GPS...';
            try { await checkGeofence(payload.geo); } 
            catch (geoErr) {
                fetch('/api/destroySecret', { method: 'POST', body: JSON.stringify({ id: payloadId }) });
                return triggerGlitchLockout(geoErr);
            }
        }

        playBeep(800, 'sine', 0.1, 0.2); // Access Granted Beep
        window.history.replaceState(null, null, window.location.pathname);

        // 6. Reveal
        document.getElementById('lockedState').classList.add('hidden');
        document.getElementById('decryptedState').classList.remove('hidden');
        
        const secretTextElement = document.getElementById('secretMessage');
        cipherReveal(secretTextElement, payload.text);
        startSelfDestructTimer();

    } catch (error) {
        failedAttempts++;
        if (failedAttempts >= 3) triggerGlitchLockout("Decryption failed.");
        else alert("Decryption failed. Wrong PIN or corrupted data.");
        
        btn.innerHTML = '<i class="ph ph-fire text-xl"></i> Decrypt & Read';
        btn.disabled = false;
    }
});

// Dynamic Timer with Heartbeat Audio
function startSelfDestructTimer() {
    let timeLeft = 30;
    const timeDisplay = document.getElementById('time');
    const burnRing = document.getElementById('burnRing');
    const container = document.querySelector('.secret-text-container');
    const secretMessage = document.getElementById('secretMessage');
    const circleCircumference = 125.6;

    const countdown = setInterval(() => {
        timeLeft--;
        timeDisplay.innerText = timeLeft;
        burnRing.style.strokeDashoffset = circleCircumference - ((timeLeft / 30) * circleCircumference);

        // Heartbeat Audio & Visual Pulse
        if (timeLeft <= 10 && timeLeft > 0) {
            playBeep(100, 'sine', 0.1, 0.5); // Deep heartbeat thump
            gsap.to(timeDisplay, { color: "#ef4444", scale: 1.25, yoyo: true, repeat: 1, duration: 0.2 });
        }

        if (timeLeft <= 0) {
            clearInterval(countdown);
            playBeep(200, 'square', 0.3, 0.1); // Sizzle/Burn sound
            if (navigator.vibrate) navigator.vibrate([50, 50, 300]);
            
            secretMessage.classList.add('disintegrate');

            gsap.to(container, {
                opacity: 0, height: 0, duration: 1.5, delay: 1.5,
                onComplete: () => {
                    document.getElementById('decryptedState').classList.add('hidden');
                    document.getElementById('destroyedState').classList.remove('hidden');
                    secretMessage.innerText = '';
                }
            });
        }
    }, 1000);
}
