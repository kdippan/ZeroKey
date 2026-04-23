document.addEventListener('DOMContentLoaded', () => {
    const runTestBtn = document.getElementById('runTestBtn');
    const finalVerdict = document.getElementById('finalVerdict');

    function updateCard(cardId, isSuccess) {
        const card = document.getElementById(cardId);
        const icon = card.querySelector('.status-icon');
        
        icon.className = isSuccess 
            ? 'ph-fill ph-check-circle text-2xl success-icon' 
            : 'ph-fill ph-x-circle text-2xl fail-icon';
            
        if (isSuccess) {
            card.classList.add('border-emerald-500/30', 'bg-emerald-950/10');
            card.classList.remove('border-slate-700', 'bg-[#020617]');
        } else {
            card.classList.add('border-red-500/30', 'bg-red-950/10');
            card.classList.remove('border-slate-700', 'bg-[#020617]');
        }
        
        return isSuccess;
    }

    async function runDiagnostics() {
        const originalBtnHTML = runTestBtn.innerHTML;
        runTestBtn.innerHTML = '<i class="ph ph-spinner-gap animate-spin"></i> Testing...';
        runTestBtn.disabled = true;

        let testsPassed = 0;
        let totalTests = 6;

        const hasCrypto = window.crypto !== undefined;
        if (updateCard('card-crypto', hasCrypto)) testsPassed++;

        const hasSubtle = hasCrypto && window.crypto.subtle !== undefined;
        if (updateCard('card-subtle', hasSubtle)) testsPassed++;

        const hasRandom = hasCrypto && typeof window.crypto.getRandomValues === 'function';
        if (updateCard('card-random', hasRandom)) testsPassed++;

        let hasAes = false;
        let hasPbkdf2 = false;
        let hasSha = false;

        if (hasSubtle) {
            try {
                const key = await window.crypto.subtle.generateKey(
                    { name: "AES-GCM", length: 256 },
                    true,
                    ["encrypt", "decrypt"]
                );
                hasAes = !!key;
            } catch (e) {
                hasAes = false;
            }

            try {
                const password = new TextEncoder().encode("test");
                const keyMaterial = await window.crypto.subtle.importKey(
                    "raw", password, { name: "PBKDF2" }, false, ["deriveBits"]
                );
                hasPbkdf2 = !!keyMaterial;
            } catch (e) {
                hasPbkdf2 = false;
            }

            try {
                const data = new TextEncoder().encode("test");
                const hash = await window.crypto.subtle.digest("SHA-256", data);
                hasSha = !!hash;
            } catch (e) {
                hasSha = false;
            }
        }

        if (updateCard('card-aes', hasAes)) testsPassed++;
        if (updateCard('card-pbkdf2', hasPbkdf2)) testsPassed++;
        if (updateCard('card-sha', hasSha)) testsPassed++;

        if (testsPassed === totalTests) {
            finalVerdict.innerHTML = '<div class="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg font-medium"><i class="ph-fill ph-check-circle"></i> Environment Fully Supported</div>';
        } else {
            finalVerdict.innerHTML = '<div class="inline-flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-lg font-medium"><i class="ph-fill ph-warning-circle"></i> Environment Not Supported</div><p class="text-xs text-slate-500 mt-2">Ensure you are using a modern browser over a secure HTTPS connection.</p>';
        }

        runTestBtn.innerHTML = originalBtnHTML;
        runTestBtn.disabled = false;
    }

    runTestBtn.addEventListener('click', runDiagnostics);
});
