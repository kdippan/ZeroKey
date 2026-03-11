<div align="center">

# 🔐 ZeroKey
**Share Secrets. Leave No Trace.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Operational-10b981?style=for-the-badge&logo=vercel)](https://zerokey.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Security: AES-256-GCM](https://img.shields.io/badge/Security-AES--256--GCM-red?style=for-the-badge&logo=springsecurity)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
[![Sponsor](https://img.shields.io/badge/Sponsor-Dippan-ea4c89?style=for-the-badge&logo=githubsponsors)](https://github.com/sponsors/kdippan)

A paranoid-grade, zero-knowledge payload delivery system built for privacy advocates, journalists, and ethical hackers. Send highly secure, geofenced, self-destructing messages and files using purely client-side encryption.

[Live Application](https://zerokey.vercel.app) · [Technical Architecture](https://zerokey.vercel.app/about) · [Report a Vulnerability](https://zerokey.vercel.app/contact)

</div>

---

## ⚡ Why ZeroKey?
Standard messaging apps claim "end-to-end encryption," but they still retain your metadata, link previews, and decryption keys in their proprietary ecosystems. 

ZeroKey mathematically eliminates server-side trust. By utilizing the native **Web Crypto API**, payloads are locked locally in the browser's RAM. Our database only stores randomized, unreadable ciphertext.

## 🛡️ Core Features
* **Client-Side AES-256-GCM:** Data is scrambled locally before any network request is made. If a single bit is altered in transit, decryption automatically fails.
* **Zero-Knowledge Architecture (The Hash Exploit):** The decryption key is generated locally and embedded inside the URL fragment (`#hash`). Standard web browsers *never* transmit the fragment to the server. We fundamentally cannot read your data.
* **Burn After Reading:** The exact millisecond a payload is decrypted, it is subjected to a permanent `DELETE` command on the database. No archives, no backups.
* **Biometric Bot-Shield:** Integrates with WebAuthn (TouchID/FaceID) to require physical human presence, preventing chat-bots (like iMessage or Slack preview bots) from accidentally triggering the payload destruction.
* **Geofencing:** Lock decryption to a 50-meter GPS radius. If the recipient is not at the physical location, the data self-destructs instantly.

---

## 🏗️ Technical Stack
* **Frontend:** HTML5, TailwindCSS, Phosphor Icons, GSAP (Animations).
* **Cryptography:** Native browser Web Crypto API (AES-GCM, PBKDF2, SHA-256).
* **Backend / Database:** [Supabase](https://supabase.com/) (PostgreSQL & Object Storage).
* **Hosting / Routing:** Vercel Edge Network.

---

## 🚀 Local Development Setup

Want to run ZeroKey on your own machine or deploy your own instance?

### 1. Clone the repository
```bash
git clone [https://github.com/kdippan/zerokey.git](https://github.com/kdippan/zerokey.git)
cd zerokey
```

### 2. Configure Supabase
You will need a Supabase project to handle the encrypted blobs.
 * Create a new project on Supabase.
 * Create a table named secrets with columns for the id (UUID), encryptedBase64, ivBase64, etc.
 * Create an open storage bucket named media for encrypted file blobs.
 * Set your environment variables in your .env file or directly in your backend API functions:
<!-- end list -->
```sh
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```
### 3. Run the application
Since ZeroKey relies heavily on standard HTML/JS, you can serve it locally using any static server:
# Using Node.js
```npx serve```

# Or using Python
``` bash
python3 -m http.server 8000
```
Open ```http://localhost:8000``` in your browser.
### 🤝 Contributing
# ZeroKey is open-source. We welcome contributions from cryptographers, developers, and privacy researchers.
 * Fork the Project.
 * Create your Feature Branch (git checkout -b feature/AmazingFeature).
 * Commit your Changes (git commit -m 'Add some AmazingFeature').
 * Push to the Branch (git push origin feature/AmazingFeature).
 * Open a Pull Request.
#### ⚠️ Security Disclosures
If you discover a potential vulnerability in the cryptographic pipeline or backend architecture, please DO NOT open a public issue.
Please contact the developer directly via the Secure Contact Form or email 
```Dippan.connect@gmail.com```
### ☕ Support the Mission
# ZeroKey is completely free, ad-free, and open-source. Maintaining the server infrastructure costs money. If this tool helps secure your data, consider supporting my late-night coding sessions.
 * GitHub Sponsors: ```@kdippan```
 * Bitcoin (BTC): 1AV4KnX6qMiiMSUSGMq2M2fuhwLcQEra8U

 * UPI: dippan@fam
<div align="center">
<p>Built with ⚡ by <a href="https://github.com/kdippan">Dippan Bhusal</a></p>
<p>&copy; 2026 ZeroKey. All rights reserved.</p>
</div>
