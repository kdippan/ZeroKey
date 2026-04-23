document.addEventListener('DOMContentLoaded', () => {
    const jwtInput = document.getElementById('jwtInput');
    const jwtHeader = document.getElementById('jwtHeader');
    const jwtPayload = document.getElementById('jwtPayload');
    const clearTokenBtn = document.getElementById('clearTokenBtn');
    const statusIndicator = document.getElementById('statusIndicator');

    function decodeBase64Url(str) {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        const padLength = (4 - (base64.length % 4)) % 4;
        base64 += '='.repeat(padLength);
        const decoded = window.atob(base64);
        try {
            return decodeURIComponent(decoded.split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
        } catch (e) {
            return decoded;
        }
    }

    function processJWT() {
        const token = jwtInput.value.trim();
        
        if (!token) {
            jwtHeader.textContent = '';
            jwtPayload.textContent = '';
            statusIndicator.innerHTML = '<i class="ph-fill ph-info text-lg"></i> Waiting for token...';
            statusIndicator.className = 'mt-4 flex items-center gap-2 text-sm font-medium text-slate-500';
            return;
        }

        const parts = token.split('.');

        if (parts.length !== 3) {
            jwtHeader.textContent = '';
            jwtPayload.textContent = '';
            statusIndicator.innerHTML = '<i class="ph-fill ph-warning-circle text-lg"></i> Invalid JWT format';
            statusIndicator.className = 'mt-4 flex items-center gap-2 text-sm font-medium text-red-400';
            return;
        }

        try {
            const headerStr = decodeBase64Url(parts[0]);
            const payloadStr = decodeBase64Url(parts[1]);

            const headerObj = JSON.parse(headerStr);
            const payloadObj = JSON.parse(payloadStr);

            jwtHeader.textContent = JSON.stringify(headerObj, null, 2);
            jwtPayload.textContent = JSON.stringify(payloadObj, null, 2);
            
            statusIndicator.innerHTML = '<i class="ph-fill ph-check-circle text-lg"></i> Token successfully decoded locally';
            statusIndicator.className = 'mt-4 flex items-center gap-2 text-sm font-medium text-emerald-400';
            
        } catch (error) {
            jwtHeader.textContent = '';
            jwtPayload.textContent = '';
            statusIndicator.innerHTML = '<i class="ph-fill ph-warning-circle text-lg"></i> Error parsing token payload';
            statusIndicator.className = 'mt-4 flex items-center gap-2 text-sm font-medium text-red-400';
        }
    }

    jwtInput.addEventListener('input', processJWT);

    clearTokenBtn.addEventListener('click', () => {
        jwtInput.value = '';
        processJWT();
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
