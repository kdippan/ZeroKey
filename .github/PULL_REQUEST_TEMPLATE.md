## Description
Fixes # (issue number)

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update (changes to README, architecture docs, etc.)
- [ ] 🔒 Security patch (fixes a vulnerability or strengthens cryptography)

## 🔐 Security & Zero-Knowledge Verification
- [ ] I confirm that this PR **DOES NOT** introduce any code that sends unencrypted plaintext data to the backend.
- [ ] I confirm that this PR **DOES NOT** send the URL fragment (the decryption key) to the backend.
- [ ] If this PR modifies the `script.js` or `view.js` cryptography pipeline, I have tested it against the Web Crypto API standards.

## Testing Performed
- [ ] Tested on Desktop (Chrome/Firefox/Safari)
- [ ] Tested on Mobile (iOS/Android)
- [ ] Verified payload encryption and decryption flow
- [ ] Verified burn-after-reading database destruction

## Checklist:
- [ ] My code follows the style guidelines of this project (Vanilla JS, Tailwind CSS).
- [ ] I have performed a self-review of my own code.
- [ ] I have commented my code, particularly in hard-to-understand cryptographic areas.
- [ ] My changes generate no new browser console errors.
