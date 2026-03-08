function bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
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

async function encryptPayload(dataBuffer, key) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedContent = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, dataBuffer);
    return { encryptedBase64: bufferToBase64(encryptedContent), ivBase64: bufferToBase64(iv) };
}

function getCoordinates() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject("Geolocation not supported.");
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            err => reject("Location permission denied.")
        );
    });
}

let selectedMedia = null;
let selectedMediaBuffer = null;

document.getElementById('attachBtn').addEventListener('click', () => document.getElementById('fileInput').click());

document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
        alert("File is too large. For maximum encryption stability, please keep media under 2MB.");
        e.target.value = '';
        return;
    }

    selectedMedia = file;
    document.getElementById('fileName').innerHTML = `<i class="ph ph-image text-blue-400 mr-2 text-lg"></i> ${file.name} (${(file.size/1024).toFixed(1)} KB)`;
    document.getElementById('filePreview').classList.remove('hidden');
    document.getElementById('attachBtn').classList.add('hidden');

    const reader = new FileReader();
    reader.onload = (event) => { selectedMediaBuffer = event.target.result; };
    reader.readAsArrayBuffer(file);
});

document.getElementById('removeFileBtn').addEventListener('click', () => {
    selectedMedia = null;
    selectedMediaBuffer = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('filePreview').classList.add('hidden');
    document.getElementById('attachBtn').classList.remove('hidden');
});

document.getElementById('encryptBtn').addEventListener('click', async () => {
    const rawText = document.getElementById('secretInput').value;
    const pinInput = document.getElementById('pinInput').value.trim();
    const useGeo = document.getElementById('geoToggle').checked;
    
    if (!rawText && !selectedMedia) return alert("Please enter a message or attach a file!");

    const btn = document.getElementById('encryptBtn');
    btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Cryptographic Processing...';
    btn.disabled = true;

    try {
        let coords = null;
        if (useGeo) {
            btn.innerHTML = '<i class="ph ph-crosshair animate-pulse text-xl"></i> Locking Coordinates...';
            coords = await getCoordinates();
        }

        const payloadObject = { 
            text: rawText, 
            geo: coords,
            hasFile: !!selectedMedia,
            fileType: selectedMedia ? selectedMedia.type : null,
            fileName: selectedMedia ? selectedMedia.name : null
        };
        
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        let hashData = "LOCKED";
        let activePin = pinInput;

        if (!pinInput) {
            activePin = bufferToBase64(window.crypto.getRandomValues(new Uint8Array(12)));
            hashData = activePin;
        }

        const cryptoKey = await deriveKey(activePin, salt);

        const textBuffer = new TextEncoder().encode(JSON.stringify(payloadObject));
        const { encryptedBase64, ivBase64 } = await encryptPayload(textBuffer, cryptoKey);

        let finalFileBase64 = null;
        let finalFileIvBase64 = null;

        if (selectedMediaBuffer) {
            btn.innerHTML = '<i class="ph ph-file-lock animate-pulse text-xl"></i> Encrypting Media Blob...';
            const fileEnc = await encryptPayload(selectedMediaBuffer, cryptoKey);
            finalFileBase64 = fileEnc.encryptedBase64;
            finalFileIvBase64 = fileEnc.ivBase64;
        }

        btn.innerHTML = '<i class="ph ph-cloud-arrow-up animate-pulse text-xl"></i> Securing Vault...';
        
        const response = await fetch('/api/saveSecret', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                encryptedBase64, 
                ivBase64,
                encryptedFileBase64: finalFileBase64,
                fileIvBase64: finalFileIvBase64
            })
        });

        if (!response.ok) {
            let errorMsg = `HTTP Error ${response.status}`;
            try {
                const errData = await response.json();
                errorMsg = errData.error || errorMsg;
            } catch(e) {}
            throw new Error(errorMsg);
        }

        const { id } = await response.json();

        const secureLink = `${window.location.origin}/view.html?id=${id}&iv=${encodeURIComponent(ivBase64)}&salt=${encodeURIComponent(bufferToBase64(salt))}#${encodeURIComponent(hashData)}`;

        document.getElementById('resultContainer').classList.remove('hidden');
        document.getElementById('linkOutput').value = secureLink;
        document.getElementById('secretInput').value = ''; 
        document.getElementById('pinInput').value = '';
        document.getElementById('removeFileBtn').click(); 

        const qrContainer = document.getElementById("qrcode");
        qrContainer.innerHTML = ""; 
        new QRCode(qrContainer, { text: secureLink, width: 160, height: 160, colorDark : "#0f172a", colorLight : "#ffffff" });

    } catch (error) {
        console.error("Encryption Error:", error);
        alert(error.message || "Failed to secure payload."); 
    } finally {
        btn.innerHTML = '<i class="ph ph-shield-check text-xl"></i> Encrypt Payload';
        btn.disabled = false;
    }
});

document.getElementById('copyBtn').addEventListener('click', () => {
    const linkInput = document.getElementById('linkOutput');
    linkInput.select();
    navigator.clipboard.writeText(linkInput.value);
    
    const copyBtn = document.getElementById('copyBtn');
    copyBtn.innerHTML = '<i class="ph ph-check text-emerald-400 text-lg"></i>';
    setTimeout(() => { copyBtn.innerHTML = '<i class="ph ph-copy text-lg"></i>'; }, 2000);
});
