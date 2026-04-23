document.addEventListener('DOMContentLoaded', () => {
    const base64Input = document.getElementById('base64Input');
    const hexInput = document.getElementById('hexInput');
    const convertToHexBtn = document.getElementById('convertToHexBtn');
    const convertToBase64Btn = document.getElementById('convertToBase64Btn');
    const clearBase64Btn = document.getElementById('clearBase64Btn');
    const clearHexBtn = document.getElementById('clearHexBtn');
    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');

    function showError(message) {
        errorMessage.textContent = message;
        errorContainer.style.display = 'block';
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 4000);
    }

    function base64ToHex(base64) {
        const raw = window.atob(base64);
        let result = '';
        for (let i = 0; i < raw.length; i++) {
            const hex = raw.charCodeAt(i).toString(16);
            result += (hex.length === 2 ? hex : '0' + hex);
        }
        return result.toUpperCase();
    }

    function hexToBase64(hexString) {
        const hex = hexString.replace(/\s/g, '');
        if (hex.length % 2 !== 0) {
            throw new Error("Hex string must have an even number of characters");
        }
        let raw = '';
        for (let i = 0; i < hex.length; i += 2) {
            raw += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        return window.btoa(raw);
    }

    convertToHexBtn.addEventListener('click', () => {
        try {
            const base64Value = base64Input.value.trim();
            if (!base64Value) throw new Error("Base64 input is empty");
            hexInput.value = base64ToHex(base64Value);
        } catch (error) {
            showError("Invalid Base64 string provided.");
        }
    });

    convertToBase64Btn.addEventListener('click', () => {
        try {
            const hexValue = hexInput.value.trim();
            if (!hexValue) throw new Error("Hex input is empty");
            if (!/^[0-9A-Fa-f\s]+$/.test(hexValue)) {
                throw new Error("Invalid hex characters");
            }
            base64Input.value = hexToBase64(hexValue);
        } catch (error) {
            showError("Invalid Hex string provided. Ensure it contains only valid hexadecimal characters (0-9, A-F).");
        }
    });

    clearBase64Btn.addEventListener('click', () => {
        base64Input.value = '';
    });

    clearHexBtn.addEventListener('click', () => {
        hexInput.value = '';
    });
});
// --- Scroll Reveal Logic ---
const reveals = document.querySelectorAll('.reveal');
const revealOnScroll = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
reveals.forEach(reveal => revealOnScroll.observe(reveal));

// --- Code Copy Button Logic ---
document.querySelectorAll('.copy-code-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const targetId = btn.getAttribute('data-target');
        const codeElement = document.getElementById(targetId);
        
        if(codeElement) {
            await navigator.clipboard.writeText(codeElement.innerText);
            
            // Analytics Tracking
            if (typeof gtag === 'function') {
                gtag('event', 'click', { 'event_category': 'Tool', 'event_label': 'Copied Snippet' });
            }

            // Visual Feedback
            btn.innerHTML = '<i class="ph-fill ph-check-circle text-emerald-400"></i> Copied!';
            btn.classList.add('text-emerald-400');
            setTimeout(() => {
                btn.innerHTML = '<i class="ph ph-copy"></i> Copy';
                btn.classList.remove('text-emerald-400');
            }, 2000);
        }
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
