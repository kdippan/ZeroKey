document.addEventListener('DOMContentLoaded', () => {
    const calcBtn = document.getElementById('calculateBtn');
    const outputHex = document.getElementById('outputHex');
    const timeTakenLabel = document.getElementById('timeTaken');

    function bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    async function derivePBKDF2(password, saltString, iterations, hashAlg) {
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );
        const salt = encoder.encode(saltString);
        const derivedBits = await window.crypto.subtle.deriveBits(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: iterations,
                hash: hashAlg
            },
            keyMaterial,
            256
        );
        return bufferToHex(derivedBits);
    }

    calcBtn.addEventListener('click', async () => {
        const password = document.getElementById('password').value;
        const salt = document.getElementById('salt').value;
        const iterations = parseInt(document.getElementById('iterations').value, 10);
        const hashAlg = document.getElementById('hashAlg').value;

        if (!password || !salt || isNaN(iterations) || iterations <= 0) {
            alert('Please fill out all fields with valid data.');
            return;
        }

        const originalBtnHTML = calcBtn.innerHTML;
        calcBtn.innerHTML = '<i class="ph ph-spinner-gap animate-spin text-lg"></i> Processing...';
        calcBtn.disabled = true;
        calcBtn.classList.add('opacity-80', 'cursor-not-allowed');
        calcBtn.classList.remove('hover:bg-blue-500');
        
        outputHex.value = '';
        timeTakenLabel.textContent = '';

        const startTime = performance.now();

        try {
            setTimeout(async () => {
                try {
                    const hexResult = await derivePBKDF2(password, salt, iterations, hashAlg);
                    const endTime = performance.now();
                    outputHex.value = hexResult;
                    timeTakenLabel.innerHTML = `<i class="ph ph-clock mr-1"></i> Completed in ${((endTime - startTime) / 1000).toFixed(3)}s`;
                } catch (err) {
                    outputHex.value = 'Error deriving key. Check console.';
                } finally {
                    calcBtn.innerHTML = originalBtnHTML;
                    calcBtn.disabled = false;
                    calcBtn.classList.remove('opacity-80', 'cursor-not-allowed');
                    calcBtn.classList.add('hover:bg-blue-500');
                }
            }, 10);
        } catch (error) {
            calcBtn.innerHTML = originalBtnHTML;
            calcBtn.disabled = false;
        }
    });
});
