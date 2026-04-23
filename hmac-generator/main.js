document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('messageInput');
    const secretKeyInput = document.getElementById('secretKey');
    const hashAlgSelect = document.getElementById('hashAlg');
    const outputHex = document.getElementById('outputHex');
    const outputBase64 = document.getElementById('outputBase64');
    const clearMessageBtn = document.getElementById('clearMessageBtn');

    function bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    function bufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    async function calculateHMAC() {
        const message = messageInput.value;
        const secret = secretKeyInput.value;
        const alg = hashAlgSelect.value;

        if (!message || !secret) {
            outputHex.value = '';
            outputBase64.value = '';
            return;
        }

        try {
            const encoder = new TextEncoder();
            const keyMaterial = await window.crypto.subtle.importKey(
                "raw",
                encoder.encode(secret),
                { name: "HMAC", hash: alg },
                false,
                ["sign"]
            );

            const signatureBuffer = await window.crypto.subtle.sign(
                "HMAC",
                keyMaterial,
                encoder.encode(message)
            );

            outputHex.value = bufferToHex(signatureBuffer);
            outputBase64.value = bufferToBase64(signatureBuffer);
        } catch (error) {
            console.error("HMAC calculation failed:", error);
            outputHex.value = 'Error calculating HMAC';
            outputBase64.value = 'Error calculating HMAC';
        }
    }

    messageInput.addEventListener('input', calculateHMAC);
    secretKeyInput.addEventListener('input', calculateHMAC);
    hashAlgSelect.addEventListener('change', calculateHMAC);

    clearMessageBtn.addEventListener('click', () => {
        messageInput.value = '';
        calculateHMAC();
    });
});
// --- Cookie Consent Logic ---
const cookieConsent = document.getElementById('cookieConsent');
if (cookieConsent && !localStorage.getItem('zerokey_cookies_accepted')) {
    setTimeout(() => cookieConsent.classList.remove('translate-y-[150%]'), 1000);
}
const acceptBtn = document.getElementById('acceptCookiesBtn');
if(acceptBtn) {
    acceptBtn.addEventListener('click', () => {
        localStorage.setItem('zerokey_cookies_accepted', 'true');
        cookieConsent.classList.add('translate-y-[150%]');
        if (typeof gtag === 'function') {
            gtag('event', 'cookie_consent', { 'event_category': 'Engagement', 'event_label': 'Accepted' });
        }
    });
}
