document.addEventListener('DOMContentLoaded', () => {
    const plainTextInput = document.getElementById('plainTextInput');
    const encryptPassword = document.getElementById('encryptPassword');
    const encryptBtn = document.getElementById('encryptBtn');
    const cipherTextOutput = document.getElementById('cipherTextOutput');
    const clearEncryptBtn = document.getElementById('clearEncryptBtn');

    const cipherTextInput = document.getElementById('cipherTextInput');
    const decryptPassword = document.getElementById('decryptPassword');
    const decryptBtn = document.getElementById('decryptBtn');
    const plainTextOutput = document.getElementById('plainTextOutput');
    const clearDecryptBtn = document.getElementById('clearDecryptBtn');

    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');

    const ITERATIONS = 100000;
    const SALT_LENGTH = 16;
    const IV_LENGTH = 12;

    function showError(message) {
        errorMessage.textContent = message;
        errorContainer.style.display = 'block';
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }

    function bufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    function base64ToBuffer(base64) {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }

    async function deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );
        return window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: ITERATIONS,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    encryptBtn.addEventListener('click', async () => {
        const text = plainTextInput.value.trim();
        const pass = encryptPassword.value;

        if (!text || !pass) {
            showError("Both plaintext and an encryption password are required.");
            return;
        }

        const originalHTML = encryptBtn.innerHTML;
        encryptBtn.innerHTML = '<i class="ph ph-spinner-gap animate-spin font-bold"></i> Encrypting...';
        encryptBtn.disabled = true;

        try {
            const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
            const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
            const key = await deriveKey(pass, salt);

            const encoder = new TextEncoder();
            const encryptedBuffer = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                key,
                encoder.encode(text)
            );

            const combinedPayload = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
            combinedPayload.set(salt, 0);
            combinedPayload.set(iv, salt.length);
            combinedPayload.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);

            cipherTextOutput.value = bufferToBase64(combinedPayload.buffer);
        } catch (error) {
            showError("Encryption failed. Check your environment.");
        } finally {
            encryptBtn.innerHTML = originalHTML;
            encryptBtn.disabled = false;
        }
    });

    decryptBtn.addEventListener('click', async () => {
        const b64Ciphertext = cipherTextInput.value.trim();
        const pass = decryptPassword.value;

        if (!b64Ciphertext || !pass) {
            showError("Both ciphertext and decryption password are required.");
            return;
        }

        const originalHTML = decryptBtn.innerHTML;
        decryptBtn.innerHTML = '<i class="ph ph-spinner-gap animate-spin font-bold"></i> Decrypting...';
        decryptBtn.disabled = true;
        plainTextOutput.value = '';

        try {
            const combinedBuffer = base64ToBuffer(b64Ciphertext);
            const combinedArray = new Uint8Array(combinedBuffer);

            if (combinedArray.length < SALT_LENGTH + IV_LENGTH) {
                throw new Error("Invalid ciphertext format.");
            }

            const salt = combinedArray.slice(0, SALT_LENGTH);
            const iv = combinedArray.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
            const encryptedData = combinedArray.slice(SALT_LENGTH + IV_LENGTH);

            const key = await deriveKey(pass, salt);

            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                encryptedData
            );

            const decoder = new TextDecoder();
            plainTextOutput.value = decoder.decode(decryptedBuffer);
        } catch (error) {
            showError("Decryption failed. Incorrect password, tampered data, or invalid format.");
        } finally {
            decryptBtn.innerHTML = originalHTML;
            decryptBtn.disabled = false;
        }
    });

    clearEncryptBtn.addEventListener('click', () => {
        plainTextInput.value = '';
        encryptPassword.value = '';
        cipherTextOutput.value = '';
    });

    clearDecryptBtn.addEventListener('click', () => {
        cipherTextInput.value = '';
        decryptPassword.value = '';
        plainTextOutput.value = '';
    });
});
