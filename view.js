// ==========================================
// 1. AUDIO & CRYPTOGRAPHY (Keep existing setup)
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

function base64ToBuffer(base64) { return Uint8Array.from(window.atob(base64), c => c.charCodeAt(0)).buffer; }

async function deriveKey(pinStr, saltBase64) {
    const enc = new TextEncoder();
    const saltBuffer = base64ToBuffer(saltBase64);
    const keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(pinStr), { name: "PBKDF2" }, false, ["deriveKey"]);
    return await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: saltBuffer, iterations: 100000, hash: "SHA-256" },
        keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
    );
}

async function decryptPayload(encryptedBase64, key, ivBase64) {
    const encryptedBuffer = base64ToBuffer(encryptedBase64);
    const ivBuffer = new Uint8Array(base64ToBuffer(ivBase64));
    const decryptedBuffer = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuffer }, key, encryptedBuffer);
    return new TextDecoder().decode(decryptedBuffer);
}

// ==========================================
// 2. BIOMETRICS & GEOFENCING
// ==========================================
async function verifyBiometrics() {
    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        await navigator.credentials.create({
            publicKey: {
                challenge: challenge,
                rp: { name: "ZeroKey Vault", id: window.location.hostname },
                user: { id: new Uint8Array(16), name: "user@zerokey", displayName: "ZeroKey User" },
                pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
                timeout: 60000
            }
        });
        return true;
    } catch (err) {
        console.warn("Biometric failed:", err);
        return false;
    }
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; const rad = Math.PI / 180;
    const a = Math.sin((lat2 - lat1)*rad/2) ** 2 + Math.cos(lat1*rad) * Math.cos(lat2*rad) * Math.sin((lon2 - lon1)*rad/2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function checkGeofence(targetCoords) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject("GPS unavailable.");
        navigator.geolocation.getCurrentPosition(
            pos => {
                const dist = getDistance(targetCoords.lat, targetCoords.lng, pos.coords.latitude, pos.coords.longitude);
                if (dist > 50) reject(`Out of bounds by ${Math.round(dist)}m.`);
                else resolve(true);
            },
            err => reject("Location permission denied.")
        );
    });
}

// ==========================================
// 3. UI, EFFECTS & VISIBILITY LOCK
// ==========================================
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && !document.getElementById('decryptedState').classList.contains('hidden')) {
        document.getElementById('mainCard').classList.add('security-blur');
    }
});

function triggerGlitchLockout(reason) {
    document.getElementById('mainCard').classList.add('glitch-active');
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 500]);
    playBeep(150, 'sawtooth', 0.5, 0.5);
    
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
        iterations += 1/2;
    }, 30);
}

// ==========================================
// 4. CORE DECRYPTION LOGIC
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
const payloadId = urlParams.get('id');
const ivBase64 = urlParams.get('iv');
const saltBase64 = urlParams.get('salt');
const hashKey = window.location.hash.substring(1);

document.getElementById('verifyHumanBtn').addEventListener('click', () => {
    initAudio(); playBeep(600, 'sine', 0.1, 0.1);
    document.getElementById('antiBotState').classList.add('hidden');
    document.getElementById('lockedState').classList.remove('hidden');
    if (hashKey === "LOCKED") document.getElementById('pinContainer').classList.remove('hidden');
});

let failedAttempts = 0;

document.getElementById('decryptBtn').addEventListener('click', async () => {
    if (!payloadId || !ivBase64 || !saltBase64 || !hashKey) return alert("Broken link.");

    let activePin = hashKey;
    
    // CONDITION 1: User set a PIN
    if (hashKey === "LOCKED") {
        activePin = document.getElementById('receiverPin').value.trim();
        if (!activePin) return alert("Decryption PIN is required.");
    } 
    // CONDITION 2: No PIN set, force Native Biometrics
    else {
        const isAuthorized = await verifyBiometrics();
        if (!isAuthorized) {
            failedAttempts++;
            if (failedAttempts >= 3) {
                fetch('/api/destroySecret', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: payloadId }) });
                return triggerGlitchLockout("Max biometric failures.");
            }
            return alert(`Device Auth failed. ${3 - failedAttempts} attempts left.`);
        }
    }

    const btn = document.getElementById('decryptBtn');
    btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Decrypting...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/getSecret', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: payloadId })
        });

        if (!response.ok) throw new Error("Intercepted or destroyed.");
        const { encryptedBase64 } = await response.json();

        const cryptoKey = await deriveKey(activePin, saltBase64);
        const decryptedJson = await decryptPayload(encryptedBase64, cryptoKey, decodeURIComponent(ivBase64));
        const payload = JSON.parse(decryptedJson);

        if (payload.geo) {
            btn.innerHTML = '<i class="ph ph-crosshair animate-pulse text-xl"></i> Verifying GPS...';
            try { await checkGeofence(payload.geo); } 
            catch (geoErr) {
                fetch('/api/destroySecret', { method: 'POST', body: JSON.stringify({ id: payloadId }) });
                return triggerGlitchLockout(geoErr);
            }
        }

        playBeep(800, 'sine', 0.1, 0.2); 
        window.history.replaceState(null, null, window.location.pathname);

        document.getElementById('lockedState').classList.add('hidden');
        document.getElementById('decryptedState').classList.remove('hidden');
        cipherReveal(document.getElementById('secretMessage'), payload.text);
        startSelfDestructTimer();

    } catch (error) {
        failedAttempts++;
        if (failedAttempts >= 3) triggerGlitchLockout("Decryption failed.");
        else alert("Decryption failed. Wrong PIN or corrupted data.");
        btn.innerHTML = '<i class="ph ph-fire text-xl"></i> Decrypt & Read';
        btn.disabled = false;
    }
});

function startSelfDestructTimer() {
    let timeLeft = 30;
    const timeDisplay = document.getElementById('time');
    const burnRing = document.getElementById('burnRing');
    const container = document.querySelector('.secret-text-container');
    const secretMessage = document.getElementById('secretMessage');

    const countdown = setInterval(() => {
        timeLeft--;
        timeDisplay.innerText = timeLeft;
        burnRing.style.strokeDashoffset = 125.6 - ((timeLeft / 30) * 125.6);

        if (timeLeft <= 10 && timeLeft > 0) {
            playBeep(100, 'sine', 0.1, 0.5); 
            gsap.to(timeDisplay, { color: "#ef4444", scale: 1.25, yoyo: true, repeat: 1, duration: 0.2 });
        }

        if (timeLeft <= 0) {
            clearInterval(countdown);
            playBeep(200, 'square', 0.3, 0.1); 
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
