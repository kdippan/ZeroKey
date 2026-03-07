// ==========================================
// 1. WEB CRYPTO UTILITIES (Decryption)
// ==========================================
function base64ToBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

async function importKey(base64Key) {
    const keyBuffer = base64ToBuffer(base64Key);
    return await window.crypto.subtle.importKey(
        "raw", keyBuffer, { name: "AES-GCM" }, false, ["decrypt"]
    );
}

async function decryptMessage(encryptedBase64, key, ivBase64) {
    const encryptedBuffer = base64ToBuffer(encryptedBase64);
    const ivBuffer = new Uint8Array(base64ToBuffer(ivBase64));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBuffer }, key, encryptedBuffer
    );
    return new TextDecoder().decode(decryptedBuffer);
}


// ==========================================
// 2. PAGE VISIBILITY LOCK (Blur Failsafe)
// ==========================================
document.addEventListener("visibilitychange", () => {
    const mainCard = document.getElementById('mainCard');
    const overlay = document.getElementById('securityOverlay');
    const decryptedState = document.getElementById('decryptedState');
    
    // Lock the app if the tab is hidden AFTER the message is decrypted
    if (document.visibilityState === "hidden" && !decryptedState.classList.contains('hidden')) {
        mainCard.classList.add('security-blur');
        overlay.classList.remove('hidden');
    }
});


// ==========================================
// 3. BIOMETRIC GATEKEEPING (WebAuthn)
// ==========================================
async function verifyBiometrics() {
    try {
        // Generate a random challenge purely to trigger the local device prompt
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        await navigator.credentials.create({
            publicKey: {
                challenge: challenge,
                rp: { name: "ZeroKey Vault", id: window.location.hostname },
                user: {
                    id: new Uint8Array(16),
                    name: "user@zerokey",
                    displayName: "ZeroKey User"
                },
                pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256
                authenticatorSelection: {
                    authenticatorAttachment: "platform", // Forces FaceID/Fingerprint/Passcode
                    userVerification: "required"
                },
                timeout: 60000
            }
        });
        return true; 
    } catch (err) {
        console.warn("Biometric verification failed or was canceled:", err);
        return false;
    }
}

// Handle Unlock Button on the Overlay
document.getElementById('unlockBtn').addEventListener('click', async () => {
    const passed = await verifyBiometrics();
    if (passed) {
        document.getElementById('mainCard').classList.remove('security-blur');
        document.getElementById('securityOverlay').classList.add('hidden');
    } else {
        // Warning haptic feedback
        if (navigator.vibrate) navigator.vibrate([200]);
        alert("Authentication failed. The session remains locked.");
    }
});


// ==========================================
// 4. MAIN DECRYPTION & KILL SWITCH LOGIC
// ==========================================
let failedAttempts = 0;
const MAX_ATTEMPTS = 3;

document.getElementById('decryptBtn').addEventListener('click', async () => {
    
    // 1. Parse URL Parameters
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const ivBase64 = urlParams.get('iv');
    const hashKey = window.location.hash.substring(1);

    if (!id || !ivBase64 || !hashKey) return alert("Invalid or broken secure link.");

    // 2. Require Biometric Verification
    const isAuthenticated = await verifyBiometrics();

    // 3. Handle Brute Force Kill Switch
    if (!isAuthenticated) {
        failedAttempts++;
        const attemptsLeft = MAX_ATTEMPTS - failedAttempts;

        if (failedAttempts >= MAX_ATTEMPTS) {
            // FIRE THE KILL SWITCH API
            try {
                await fetch('/api/destroySecret', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id })
                });
            } catch (err) {
                console.error("Kill switch network error, but blocking locally.", err);
            }

            // Aggressive haptic feedback for lockout
            if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 500]);

            // Update UI to Permanent Lockout
            document.getElementById('lockedState').classList.add('hidden');
            const destroyedState = document.getElementById('destroyedState');
            destroyedState.classList.remove('hidden');
            
            // Re-style the destroyed state for a security breach
            destroyedState.querySelector('h2').innerText = "Security Lockout";
            destroyedState.querySelector('h2').classList.replace('text-slate-400', 'text-red-500');
            destroyedState.querySelector('i').classList.replace('ph-wind', 'ph-shield-warning');
            destroyedState.querySelector('i').classList.replace('text-slate-400', 'text-red-500');
            destroyedState.querySelector('p').innerText = "Maximum biometric failures reached. The payload has been permanently wiped from the database to prevent unauthorized access.";
            
            return; // Halt execution
        } else {
            if (navigator.vibrate) navigator.vibrate([200]);
            return alert(`Authentication failed. You have ${attemptsLeft} attempt(s) remaining before the payload is destroyed.`);
        }
    }

    // 4. Decrypt Payload (If Biometrics Pass)
    const btn = document.getElementById('decryptBtn');
    btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Decrypting...';
    btn.disabled = true;

    try {
        // Fetch and instantly delete from database
        const response = await fetch('/api/getSecret', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        if (!response.ok) throw new Error("Message already destroyed, intercepted, or does not exist.");

        const { encryptedBase64 } = await response.json();
        const cryptoKey = await importKey(decodeURIComponent(hashKey));
        const decryptedText = await decryptMessage(encryptedBase64, cryptoKey, decodeURIComponent(ivBase64));

        // Clean the URL hash immediately for security
        window.history.replaceState(null, null, window.location.pathname);

        // Update UI States
        document.getElementById('lockedState').classList.add('hidden');
        document.getElementById('decryptedState').classList.remove('hidden');
        document.getElementById('secretMessage').innerText = decryptedText;

        // Initiate the Burn Sequence
        startSelfDestructTimer();

    } catch (error) {
        alert(error.message);
        btn.innerHTML = '<i class="ph ph-fire text-xl"></i> Decrypt & Read';
        btn.disabled = false;
    }
});


// ==========================================
// 5. DYNAMIC BURN TIMER & TACTILE FEEDBACK
// ==========================================
function startSelfDestructTimer() {
    const totalTime = 30; // 30 second burn timer
    let timeLeft = totalTime;
    
    const timeDisplay = document.getElementById('time');
    const burnRing = document.getElementById('burnRing');
    const container = document.querySelector('.secret-text-container');
    const secretMessage = document.getElementById('secretMessage');
    
    // Calculate the exact circumference of our SVG circle (r=20)
    const circleCircumference = 2 * Math.PI * 20;

    const countdown = setInterval(() => {
        timeLeft--;
        timeDisplay.innerText = timeLeft;

        // Smoothly animate the SVG stroke dashoffset
        const percentage = timeLeft / totalTime;
        const offset = circleCircumference - (percentage * circleCircumference);
        burnRing.style.strokeDashoffset = offset;

        // Heartbeat pulse effect when under 10 seconds
        if (timeLeft <= 10) {
            gsap.to(timeDisplay, { color: "#ef4444", scale: 1.25, yoyo: true, repeat: 1, duration: 0.2 });
        }

        // When timer hits zero -> Destroy
        if (timeLeft <= 0) {
            clearInterval(countdown);
            
            // 1. Tactile confirmation: short, short, long vibration
            if (navigator.vibrate) navigator.vibrate([50, 50, 300]);
            
            // 2. Trigger CSS Ash Disintegration Keyframes
            secretMessage.classList.add('disintegrate');

            // 3. GSAP smooth collapse and UI swap
            gsap.to(container, {
                opacity: 0,
                height: 0,
                duration: 1.5,
                delay: 1.5, // Wait for CSS ash animation to complete
                ease: "power2.inOut",
                onComplete: () => {
                    document.getElementById('decryptedState').classList.add('hidden');
                    document.getElementById('destroyedState').classList.remove('hidden');
                    
                    // Nuke the text from the DOM completely
                    secretMessage.innerText = '';
                }
            });
        }
    }, 1000);
}
