document.addEventListener('DOMContentLoaded', () => {
    const inputText = document.getElementById('inputText');
    const hashAlg = document.getElementById('hashAlg');
    const outputHash = document.getElementById('outputHash');
    const charCount = document.getElementById('charCount');

    async function calculateHash(text, algorithm) {
        if (!text) return '';
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        try {
            const hashBuffer = await window.crypto.subtle.digest(algorithm, data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        } catch (error) {
            console.error("Hashing failed:", error);
            return "Error calculating hash. Check browser support.";
        }
    }

    async function updateUI() {
        const text = inputText.value;
        const alg = hashAlg.value;
        
        charCount.textContent = `${text.length} character${text.length !== 1 ? 's' : ''}`;
        
        if (text.length > 0) {
            const hash = await calculateHash(text, alg);
            outputHash.value = hash;
        } else {
            outputHash.value = '';
        }
    }

    inputText.addEventListener('input', updateUI);
    hashAlg.addEventListener('change', updateUI);
});
