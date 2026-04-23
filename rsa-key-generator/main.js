document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const keySizeSelect = document.getElementById('keySize');
    const publicKeyOutput = document.getElementById('publicKeyOutput');
    const privateKeyOutput = document.getElementById('privateKeyOutput');
    const copyPublicBtn = document.getElementById('copyPublicBtn');
    const copyPrivateBtn = document.getElementById('copyPrivateBtn');

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    function addNewLines(str) {
        let finalString = '';
        while (str.length > 0) {
            finalString += str.substring(0, 64) + '\n';
            str = str.substring(64);
        }
        return finalString;
    }

    function toPem(keyBuffer, isPrivate) {
        const b64 = addNewLines(arrayBufferToBase64(keyBuffer));
        const header = isPrivate ? "-----BEGIN PRIVATE KEY-----\n" : "-----BEGIN PUBLIC KEY-----\n";
        const footer = isPrivate ? "-----END PRIVATE KEY-----" : "-----END PUBLIC KEY-----";
        return header + b64 + footer;
    }

    async function generateRSAKeyPair() {
        const modulusLength = parseInt(keySizeSelect.value, 10);
        
        const originalBtnHTML = generateBtn.innerHTML;
        generateBtn.innerHTML = '<i class="ph ph-spinner-gap animate-spin font-bold"></i> Generating...';
        generateBtn.disabled = true;
        generateBtn.classList.add('opacity-80', 'cursor-not-allowed');

        publicKeyOutput.value = '';
        privateKeyOutput.value = '';
        copyPublicBtn.disabled = true;
        copyPrivateBtn.disabled = true;

        try {
            setTimeout(async () => {
                try {
                    const keyPair = await window.crypto.subtle.generateKey(
                        {
                            name: "RSASSA-PKCS1-v1_5",
                            modulusLength: modulusLength,
                            publicExponent: new Uint8Array([1, 0, 1]),
                            hash: "SHA-256"
                        },
                        true,
                        ["sign", "verify"]
                    );

                    const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
                    const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

                    publicKeyOutput.value = toPem(publicKeyBuffer, false);
                    privateKeyOutput.value = toPem(privateKeyBuffer, true);

                    copyPublicBtn.disabled = false;
                    copyPrivateBtn.disabled = false;
                } catch (err) {
                    console.error("Key generation failed:", err);
                    publicKeyOutput.value = "Error generating keys.";
                    privateKeyOutput.value = "Error generating keys.";
                } finally {
                    generateBtn.innerHTML = originalBtnHTML;
                    generateBtn.disabled = false;
                    generateBtn.classList.remove('opacity-80', 'cursor-not-allowed');
                }
            }, 50);
        } catch (error) {
            generateBtn.innerHTML = originalBtnHTML;
            generateBtn.disabled = false;
        }
    }

    async function copyToClipboard(elementId, btnElement) {
        const textToCopy = document.getElementById(elementId).value;
        if (!textToCopy) return;

        try {
            await navigator.clipboard.writeText(textToCopy);
            const originalHTML = btnElement.innerHTML;
            btnElement.innerHTML = '<i class="ph-fill ph-check-circle text-emerald-400"></i> Copied!';
            btnElement.classList.add('text-emerald-400');
            setTimeout(() => {
                btnElement.innerHTML = originalHTML;
                btnElement.classList.remove('text-emerald-400');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    }

    generateBtn.addEventListener('click', generateRSAKeyPair);
    
    copyPublicBtn.addEventListener('click', () => copyToClipboard('publicKeyOutput', copyPublicBtn));
    copyPrivateBtn.addEventListener('click', () => copyToClipboard('privateKeyOutput', copyPrivateBtn));
});
