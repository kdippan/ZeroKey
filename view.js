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

function base64ToBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
    return bytes.buffer;
}

async function deriveKey(pinStr, saltBase64) {
    const enc = new TextEncoder();
    const saltBuffer = base64ToBuffer(saltBase64);
    const keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(pinStr), { name: "PBKDF2" }, false, ["deriveKey"]);
    return await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: saltBuffer, iterations: 100000, hash: "SHA-256" },
        keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
    );
}

async function decryptBuffer(encryptedBase64, key, ivBase64) {
    const encryptedBuffer = base64ToBuffer(encryptedBase64);
    const ivBuffer = new Uint8Array(base64ToBuffer(ivBase64));
    return await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuffer }, key, encryptedBuffer);
}

async function verifyBiometrics() {
    try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        await navigator.credentials.create({
            publicKey: {
                challenge, rp: { name: "ZeroKey", id: window.location.hostname },
                user: { id: new Uint8Array(16), name: "user", displayName: "User" },
                pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                authenticatorSelection: { userVerification: "required" }, timeout: 60000
            }
        });
        return true;
    } catch (err) { return false; }
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; const rad = Math.PI / 180;
    const a = Math.sin((lat2-lat1)*rad/2)**2 + Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin((lon2-lon1)*rad/2)**2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function triggerGlitchLockout(reason) {
    document.getElementById('mainCard').classList.add('glitch-active');
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 500]);
    playBeep(150, 'sawtooth', 0.5, 0.5);
    document.getElementById('lockedState').classList.add('hidden');
    document.getElementById('destroyedState').classList.remove('hidden');
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

const urlParams = new URLSearchParams(window.location.search);
const payloadId = urlParams.get('id');
const hashKey = window.location.hash.substring(1);

let activeObjectUrl = null;
let failedAttempts = 0;

document.getElementById('verifyHumanBtn').addEventListener('click', () => {
    initAudio(); playBeep(600, 'sine', 0.1, 0.1);
    document.getElementById('antiBotState').classList.add('hidden');
    document.getElementById('lockedState').classList.remove('hidden');
    if (hashKey === "LOCKED") document.getElementById('pinContainer').classList.remove('hidden');
});

document.getElementById('decryptBtn').addEventListener('click', async () => {
    if (!payloadId || !hashKey) return alert("Broken link.");

    let activePin = hashKey;
    if (hashKey === "LOCKED") {
        activePin = document.getElementById('receiverPin').value.trim();
        if (!activePin) return alert("Decryption PIN is required.");
    } else {
        const isAuthorized = await verifyBiometrics();
        if (!isAuthorized) {
            failedAttempts++;
            if (failedAttempts >= 3) {
                await fetch('/api/destroySecret', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: payloadId }) 
                });
                return triggerGlitchLockout("Max biometric failures.");
            }
            return alert("Authentication required by device owner.");
        }
    }

    const btn = document.getElementById('decryptBtn');
    btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Decrypting...';
    btn.disabled = true;

    try {
        const response = await fetch(`/api/getSecret?id=${payloadId}`, { method: 'GET' });
        if (!response.ok) throw new Error("Intercepted or destroyed.");
        
        const dbData = await response.json();
        const cryptoKey = await deriveKey(activePin, dbData.salt);

        const decryptedTextBuffer = await decryptBuffer(dbData.encrypted_payload, cryptoKey, dbData.iv);
        const payloadJson = new TextDecoder().decode(decryptedTextBuffer);
        const payload = JSON.parse(payloadJson);

        if (payload.geo) {
            btn.innerHTML = '<i class="ph ph-crosshair animate-pulse text-xl"></i> Verifying GPS...';
            try { 
                await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(
                    pos => {
                        const d = getDistance(payload.geo.lat, payload.geo.lng, pos.coords.latitude, pos.coords.longitude);
                        d > 50 ? rej(`Out of bounds by ${Math.round(d)}m.`) : res();
                    }, err => rej("Location denied.")
                ));
            } catch (geoErr) {
                await fetch('/api/destroySecret', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: payloadId }) 
                });
                return triggerGlitchLockout(geoErr);
            }
        }

        if (payload.file) {
            btn.innerHTML = '<i class="ph ph-file-lock animate-spin text-xl"></i> Rendering Media...';
            
            activeObjectUrl = payload.file.data;
            document.getElementById('mediaContainer').classList.remove('hidden');

            if (payload.file.type && payload.file.type.startsWith('image/')) {
                const img = document.getElementById('decryptedImage');
                img.src = activeObjectUrl;
                img.classList.remove('hidden');
            } else {
                const fileDiv = document.getElementById('decryptedFile');
                document.getElementById('decryptedFileName').innerHTML = `<i class="ph ph-file-dashed text-blue-400 text-xl"></i> <span class="truncate">${payload.file.name}</span>`;
                const dwnBtn = document.getElementById('downloadFileBtn');
                dwnBtn.href = activeObjectUrl;
                dwnBtn.download = payload.file.name;
                fileDiv.classList.remove('hidden');
                fileDiv.classList.add('flex');
            }
        }

        await fetch('/api/destroySecret', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: payloadId }) 
        });

        playBeep(800, 'sine', 0.1, 0.2); 
        window.history.replaceState(null, null, window.location.pathname);
        document.getElementById('lockedState').classList.add('hidden');
        document.getElementById('decryptedState').classList.remove('hidden');
        
        cipherReveal(document.getElementById('secretMessage'), payload.text || "No text payload attached.");
        startSelfDestructTimer();

    } catch (error) {
        failedAttempts++;
        if (failedAttempts >= 3) {
            await fetch('/api/destroySecret', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: payloadId }) 
            });
            triggerGlitchLockout("Decryption failed.");
        } else {
            alert("Decryption failed. Wrong PIN or corrupted data.");
        }
        btn.innerHTML = '<i class="ph ph-fire text-xl"></i> Decrypt & Read';
        btn.disabled = false;
    }
});

function startSelfDestructTimer() {
    let timeLeft = 30;
    const timeDisplay = document.getElementById('time');
    const burnRing = document.getElementById('burnRing');
    const containers = document.querySelectorAll('.secret-text-container');
    const secretMessage = document.getElementById('secretMessage');

    const countdown = setInterval(() => {
        timeLeft--;
        timeDisplay.innerText = timeLeft;
        burnRing.style.strokeDashoffset = 125.6 - ((timeLeft / 30) * 125.6);

        if (timeLeft <= 10 && timeLeft > 0) {
            playBeep(100, 'sine', 0.1, 0.5); 
            try { gsap.to(timeDisplay, { color: "#ef4444", scale: 1.25, yoyo: true, repeat: 1, duration: 0.2 }); } catch(e){}
        }

        if (timeLeft <= 0) {
            clearInterval(countdown);
            playBeep(200, 'square', 0.3, 0.1); 
            if (navigator.vibrate) navigator.vibrate([50, 50, 300]);
            
            secretMessage.classList.add('disintegrate');
            if(document.getElementById('decryptedImage')) document.getElementById('decryptedImage').classList.add('disintegrate');
            
            try {
                gsap.to(containers, {
                    opacity: 0, height: 0, duration: 1.5, delay: 1.5,
                    onComplete: () => {
                        document.getElementById('decryptedState').classList.add('hidden');
                        document.getElementById('destroyedState').classList.remove('hidden');
                        secretMessage.innerText = '';
                        document.getElementById('decryptedImage').src = '';
                        activeObjectUrl = null;
                    }
                });
            } catch(e) {
                document.getElementById('decryptedState').classList.add('hidden');
                document.getElementById('destroyedState').classList.remove('hidden');
                secretMessage.innerText = '';
                document.getElementById('decryptedImage').src = '';
                activeObjectUrl = null;
            }
        }
    }, 1000);
}
