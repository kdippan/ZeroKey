// ==========================================
// 1. CRYPTO & PBKDF2 UTILITIES
// ==========================================
function bufferToBase64(buffer) {
    return window.btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

// Generates an AES-GCM key derived from a PIN (or auto-generated string) + Salt
async function deriveKey(pinStr, saltBuffer) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw", enc.encode(pinStr), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    
    // 100,000 iterations prevents brute-forcing the PIN
    return await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: saltBuffer, iterations: 100000, hash: "SHA-256" },
        keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
    );
}

async function encryptPayload(jsonPayload, key) {
    const encodedText = new TextEncoder().encode(jsonPayload);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedContent = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv }, key, encodedText
    );
    return { encryptedBase64: bufferToBase64(encryptedContent), ivBase64: bufferToBase64(iv) };
}

// ==========================================
// 2. GEOFENCING UTILITY
// ==========================================
function getCoordinates() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject("Geolocation not supported.");
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            err => reject("Location permission denied.")
        );
    });
}

// ==========================================
// 3. ENCRYPTION ENGINE & API UPLOAD
// ==========================================
document.getElementById('encryptBtn').addEventListener('click', async () => {
    const rawText = document.getElementById('secretInput').value;
    const pinInput = document.getElementById('pinInput').value.trim();
    const useGeo = document.getElementById('geoToggle').checked;
    
    if (!rawText) return alert("Please enter a secret payload first!");

    const btn = document.getElementById('encryptBtn');
    btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Processing...';
    btn.disabled = true;

    try {
        // 1. Gather GPS Data if toggled
        let coords = null;
        if (useGeo) {
            btn.innerHTML = '<i class="ph ph-crosshair animate-pulse text-xl"></i> Locking Coordinates...';
            coords = await getCoordinates();
        }

        // 2. Build the JSON Payload
        const payloadObject = { text: rawText, geo: coords };
        const payloadString = JSON.stringify(payloadObject);

        // 3. PBKDF2 Key Derivation
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        
        let hashData;
        let activePin;

        if (pinInput) {
            // User provided a PIN. We put `#LOCKED` in the URL so receiver knows to ask for it.
            activePin = pinInput;
            hashData = "LOCKED"; 
        } else {
            // No PIN? Generate a random 16-char string to act as the PIN and embed it in the URL.
            activePin = bufferToBase64(window.crypto.getRandomValues(new Uint8Array(12)));
            hashData = activePin;
        }

        const cryptoKey = await deriveKey(activePin, salt);
        const { encryptedBase64, ivBase64 } = await encryptPayload(payloadString, cryptoKey);

        // 4. Send to Vercel Backend
        btn.innerHTML = '<i class="ph ph-cloud-arrow-up animate-pulse text-xl"></i> Securing Database...';
        const response = await fetch('/api/saveSecret', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ encryptedBase64, ivBase64 })
        });

        if (!response.ok) throw new Error("Failed to save to database");
        const { id } = await response.json();

        // 5. Construct Zero-Knowledge Link
        const saltBase64 = bufferToBase64(salt);
        const secureLink = `${window.location.origin}/view.html?id=${id}&iv=${encodeURIComponent(ivBase64)}&salt=${encodeURIComponent(saltBase64)}#${encodeURIComponent(hashData)}`;

        // 6. Update UI & Generate QR Code
        document.getElementById('resultContainer').classList.remove('hidden');
        document.getElementById('linkOutput').value = secureLink;
        document.getElementById('secretInput').value = ''; 
        document.getElementById('pinInput').value = '';

        // Render QR Code for in-person handoffs
        const qrContainer = document.getElementById("qrcode");
        qrContainer.innerHTML = ""; // Clear previous
        new QRCode(qrContainer, {
            text: secureLink,
            width: 160,
            height: 160,
            colorDark : "#0f172a", // Dark slate
            colorLight : "#ffffff", // White background for scanning
            correctLevel : QRCode.CorrectLevel.H
        });

    } catch (error) {
        console.error("Encryption Error:", error);
        alert(error.message || "Failed to secure payload.");
    } finally {
        btn.innerHTML = '<i class="ph ph-shield-check text-xl"></i> Encrypt Payload';
        btn.disabled = false;
    }
});

// ==========================================
// 4. COPY TO CLIPBOARD
// ==========================================
document.getElementById('copyBtn').addEventListener('click', () => {
    const linkInput = document.getElementById('linkOutput');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(linkInput.value);
    
    const copyBtn = document.getElementById('copyBtn');
    copyBtn.innerHTML = '<i class="ph ph-check text-emerald-400 text-lg"></i>';
    setTimeout(() => { copyBtn.innerHTML = '<i class="ph ph-copy text-lg"></i>'; }, 2000);
});
