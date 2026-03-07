// ==========================================
// 1. WEB CRYPTO UTILITIES (Encryption)
// ==========================================
function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

async function generateKey() {
    return await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true, // Allow the key to be exported to the URL hash
        ["encrypt", "decrypt"]
    );
}

async function encryptMessage(text, key) {
    const encodedText = new TextEncoder().encode(text);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedContent = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encodedText
    );
    
    return {
        encryptedBase64: bufferToBase64(encryptedContent),
        ivBase64: bufferToBase64(iv)
    };
}

async function exportKey(key) {
    const exported = await window.crypto.subtle.exportKey("raw", key);
    return bufferToBase64(exported);
}

// ==========================================
// 2. ENCRYPTION & API UPLOAD LOGIC
// ==========================================
document.getElementById('encryptBtn').addEventListener('click', async () => {
    const rawText = document.getElementById('secretInput').value;
    if (!rawText) return alert("Please enter a secret payload first!");

    const btn = document.getElementById('encryptBtn');
    
    // UI Loading State
    btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Encrypting...';
    btn.disabled = true;

    try {
        // 1. Encrypt locally in the browser
        const key = await generateKey();
        const { encryptedBase64, ivBase64 } = await encryptMessage(rawText, key);
        const stringKey = await exportKey(key);

        // 2. Send the scrambled payload to Vercel
        const response = await fetch('/api/saveSecret', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ encryptedBase64, ivBase64 })
        });

        if (!response.ok) throw new Error("Failed to save to database");

        const data = await response.json();
        const databaseId = data.id;

        // 3. Construct the Zero-Knowledge Link
        // The decryption key remains safely in the hash (#)
        const secureLink = `${window.location.origin}/view.html?id=${databaseId}&iv=${encodeURIComponent(ivBase64)}#${encodeURIComponent(stringKey)}`;

        // 4. Update UI
        document.getElementById('resultContainer').classList.remove('hidden');
        document.getElementById('linkOutput').value = secureLink;
        document.getElementById('secretInput').value = ''; // Clear textarea for security

    } catch (error) {
        console.error("Encryption/Network Error:", error);
        alert("Something went wrong saving the secret. Check your connection.");
    } finally {
        // Reset Button UI
        btn.innerHTML = '<i class="ph ph-shield-check text-xl"></i> Encrypt & Generate Link';
        btn.disabled = false;
    }
});

// ==========================================
// 3. COPY TO CLIPBOARD UX
// ==========================================
document.getElementById('copyBtn').addEventListener('click', () => {
    const linkInput = document.getElementById('linkOutput');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999); // Ensures mobile compatibility
    
    navigator.clipboard.writeText(linkInput.value);
    
    const copyBtn = document.getElementById('copyBtn');
    
    // Visual feedback
    copyBtn.innerHTML = '<i class="ph ph-check text-emerald-400 text-lg"></i>';
    copyBtn.classList.replace('hover:border-slate-500', 'border-emerald-500');
    
    // Reset after 2 seconds
    setTimeout(() => {
        copyBtn.innerHTML = '<i class="ph ph-copy text-lg"></i>';
        copyBtn.classList.replace('border-emerald-500', 'hover:border-slate-500');
    }, 2000);
});
