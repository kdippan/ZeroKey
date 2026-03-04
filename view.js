// --- Web Crypto Utility Functions for Decryption ---
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
        "raw",
        keyBuffer,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );
}

async function decryptMessage(encryptedBase64, key, ivBase64) {
    const encryptedBuffer = base64ToBuffer(encryptedBase64);
    const ivBuffer = new Uint8Array(base64ToBuffer(ivBase64));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBuffer },
        key,
        encryptedBuffer
    );

    return new TextDecoder().decode(decryptedBuffer);
}

// --- Main Receiver Logic ---
document.getElementById('decryptBtn').addEventListener('click', async () => {
    const btn = document.getElementById('decryptBtn');
    btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Decrypting...';
    btn.disabled = true;

    // 1. Parse URL Parameters & Hash
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const ivBase64 = urlParams.get('iv');
    const hashKey = window.location.hash.substring(1); // Remove the '#'

    if (!id || !ivBase64 || !hashKey) {
        alert("Invalid or broken link.");
        return;
    }

    try {
        // 2. Fetch encrypted data from Vercel (This also deletes it from Supabase!)
        const response = await fetch('/api/getSecret', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });

        if (!response.ok) {
            throw new Error("Message already destroyed or does not exist.");
        }

        const { encryptedBase64 } = await response.json();

        // 3. Decrypt Locally
        const cryptoKey = await importKey(decodeURIComponent(hashKey));
        const decryptedText = await decryptMessage(encryptedBase64, cryptoKey, decodeURIComponent(ivBase64));

        // 4. Clean up the URL so the key isn't sitting in the browser history
        window.history.replaceState(null, null, window.location.pathname);

        // 5. Update UI states
        document.getElementById('lockedState').classList.add('hidden');
        document.getElementById('decryptedState').classList.remove('hidden');
        document.getElementById('secretMessage').innerText = decryptedText;

        // 6. Start Self-Destruct Sequence
        startSelfDestructTimer();

    } catch (error) {
        console.error("Decryption failed:", error);
        alert(error.message || "Failed to decrypt. The message may have already been read.");
        btn.innerHTML = '<i class="ph ph-fire text-xl"></i> Decrypt & Read';
        btn.disabled = false;
    }
});

// --- GSAP Self-Destruct Animation & Timer ---
function startSelfDestructTimer() {
    let timeLeft = 30; // 30 seconds
    const timeDisplay = document.getElementById('time');
    const container = document.querySelector('.secret-text-container');
    const secretMessage = document.getElementById('secretMessage');

    const countdown = setInterval(() => {
        timeLeft--;
        timeDisplay.innerText = timeLeft;

        // Add a pulsing red glow via GSAP when time is running out (< 10s)
        if (timeLeft <= 10) {
            gsap.to(timeDisplay.parentElement, { color: "#ef4444", scale: 1.1, yoyo: true, repeat: 1, duration: 0.2 });
        }

        if (timeLeft <= 0) {
            clearInterval(countdown);
            
            // 1. Trigger CSS disintegration animation
            secretMessage.classList.add('disintegrate');

            // 2. Use GSAP for the container fade out & collapse
            gsap.to(container, {
                opacity: 0,
                height: 0,
                duration: 1.5,
                delay: 1.5, // Wait for CSS animation to finish
                ease: "power2.inOut",
                onComplete: () => {
                    // Switch to Destroyed State
                    document.getElementById('decryptedState').classList.add('hidden');
                    document.getElementById('destroyedState').classList.remove('hidden');
                    
                    // Clear from DOM completely
                    secretMessage.innerText = '';
                }
            });
        }
    }, 1000);
}
