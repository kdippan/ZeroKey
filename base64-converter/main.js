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
