document.addEventListener('DOMContentLoaded', () => {
    const calcBtn = document.getElementById('calculateBtn');
    const outputHex = document.getElementById('outputHex');
    const timeTakenLabel = document.getElementById('timeTaken');

    // Utility: Convert ArrayBuffer to Hex String
    function bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Main PBKDF2 Function
    async function derivePBKDF2(password, saltString, iterations, hashAlg) {
        const encoder = new TextEncoder();
        
        // 1. Import the password as a raw key
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );

        // 2. Derive the bits using PBKDF2
        const salt = encoder.encode(saltString);
        
        const derivedBits = await window.crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: iterations,
                hash: hashAlg
            },
            keyMaterial,
            256 // We want 256 bits (32 bytes) output
        );

        return bufferToHex(derivedBits);
    }

    // Handle Button Click
    calcBtn.addEventListener('click', async () => {
        const password = document.getElementById('password').value;
        const salt = document.getElementById('salt').value;
        const iterations = parseInt(document.getElementById('iterations').value, 10);
        const hashAlg = document.getElementById('hashAlg').value;

        if (!password || !salt || isNaN(iterations) || iterations <= 0) {
            alert('Please fill out all fields with valid data.');
            return;
        }

        // UI Loading State
        calcBtn.textContent = 'Calculating...';
        calcBtn.disabled = true;
        calcBtn.classList.add('opacity-75', 'cursor-not-allowed');
        outputHex.value = '';
        timeTakenLabel.textContent = '';

        const startTime = performance.now();

        try {
            // We use setTimeout to allow the UI to update to "Calculating..." before blocking the main thread
            setTimeout(async () => {
                try {
                    const hexResult = await derivePBKDF2(password, salt, iterations, hashAlg);
                    const endTime = performance.now();
                    
                    outputHex.value = hexResult;
                    timeTakenLabel.textContent = `Completed in ${((endTime - startTime) / 1000).toFixed(3)} seconds`;
                } catch (err) {
                    console.error(err);
                    outputHex.value = 'Error deriving key. Check console.';
                } finally {
                    // Reset UI
                    calcBtn.textContent = 'Generate Derived Key';
                    calcBtn.disabled = false;
                    calcBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                }
            }, 10);

        } catch (error) {
            console.error('Initial Error:', error);
            calcBtn.textContent = 'Generate Derived Key';
            calcBtn.disabled = false;
        }
    });
});
