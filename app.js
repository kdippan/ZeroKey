function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

async function deriveKey(pinStr, saltBuffer) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey("raw", enc.encode(pinStr), { name: "PBKDF2" }, false, ["deriveKey"]);
    return await window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: saltBuffer, iterations: 100000, hash: "SHA-256" },
        keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
    );
}

async function encryptPayload(payloadObj, pinStr) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(pinStr, salt);
    
    const enc = new TextEncoder();
    const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        enc.encode(JSON.stringify(payloadObj))
    );
    
    return {
        salt: bufferToBase64(salt),
        iv: bufferToBase64(iv),
        encrypted_payload: bufferToBase64(encryptedBuffer)
    };
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

document.getElementById('encryptBtn').addEventListener('click', async () => {
    const btn = document.getElementById('encryptBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Encrypting...';
    btn.disabled = true;

    try {
        const textVal = document.getElementById('secretText') ? document.getElementById('secretText').value : "";
        const fileInput = document.getElementById('fileInput');
        const pinInput = document.getElementById('pinInput') ? document.getElementById('pinInput').value.trim() : "";
        const geoToggle = document.getElementById('geoToggle') ? document.getElementById('geoToggle').checked : false;

        let payloadObj = { text: textVal };

        // 1. Process File Attachment
        if (fileInput && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            if (file.size > 2 * 1024 * 1024) throw new Error("File exceeds 2MB limit.");
            const base64Data = await readFileAsDataURL(file);
            payloadObj.file = {
                name: file.name,
                type: file.type,
                data: base64Data
            };
        }

        if (!textVal && !payloadObj.file) throw new Error("Please enter a message or attach a file.");

        // 2. Process Geofencing Lock
        if (geoToggle) {
            btn.innerHTML = '<i class="ph ph-crosshair animate-pulse text-xl"></i> Getting GPS...';
            const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 10000 }));
            payloadObj.geo = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }

        // 3. Determine Security Route (Custom PIN vs System Biometrics)
        let activePin = pinInput;
        let isLocked = true; // Assumes Custom PIN was used
        if (!activePin) {
            // No custom PIN provided. Generate a secure random hash for the URL.
            // The View.js file will force Biometrics to unlock this specific hash.
            activePin = bufferToBase64(window.crypto.getRandomValues(new Uint8Array(12))).substring(0, 12);
            isLocked = false; 
        }

        btn.innerHTML = '<i class="ph ph-lock-key animate-spin text-xl"></i> Securing Data...';
        
        // 4. Encrypt everything strictly on the device
        const encryptedData = await encryptPayload(payloadObj, activePin);

        // 5. Send secure encrypted blob to database
        const response = await fetch('/api/createSecret', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(encryptedData)
        });

        if (!response.ok) throw new Error("Failed to save to server.");
        const dbRes = await response.json();

        // 6. Generate the One-Time Link
        const linkHash = isLocked ? "LOCKED" : activePin;
        const shareUrl = `${window.location.origin}/view.html?id=${dbRes.id}#${linkHash}`;

        // 7. Update UI to show the link
        if(document.getElementById('creationState')) document.getElementById('creationState').classList.add('hidden');
        if(document.getElementById('shareState')) document.getElementById('shareState').classList.remove('hidden');
        if(document.getElementById('shareLink')) document.getElementById('shareLink').value = shareUrl;

    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// Handle the Copy Link Button
if(document.getElementById('copyLinkBtn')) {
    document.getElementById('copyLinkBtn').addEventListener('click', () => {
        const link = document.getElementById('shareLink').value;
        navigator.clipboard.writeText(link);
        const btn = document.getElementById('copyLinkBtn');
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="ph ph-check text-xl"></i> Copied!';
        setTimeout(() => btn.innerHTML = orig, 2000);
    });
}
