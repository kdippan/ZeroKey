# Changelog

All notable changes to the **ZeroKey** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-11

### Added
* **Core Cryptography Engine:** Implemented purely client-side AES-256-GCM encryption using the native Web Crypto API.
* **Zero-Knowledge Architecture:** Engineered the URL fragment (`#hash`) exploit to share decryption keys without transmitting them to the server.
* **PBKDF2 Key Derivation:** Added support for custom user PINs layered with 16-byte random salts and 100,000 SHA-256 hashing iterations to prevent brute-force attacks.
* **Media Support:** Added ArrayBuffer encryption for images and files (up to 2MB) with secure local rendering via `URL.createObjectURL()`.
* **Burn-After-Reading:** Integrated database triggers to permanently `DELETE` PostgreSQL rows and Supabase Storage blobs the millisecond a payload is decrypted.
* **Anti-Bot WebAuthn:** Implemented human verification gates to prevent social media link-scanners (like iMessage/WhatsApp) from prematurely burning links.
* **Geofencing:** Added an optional security layer that locks payload decryption to a 50-meter radius of the sender's original GPS coordinates.
* **Frontend UI/UX:**
  * Fully responsive, dark-mode glassmorphism interface built with Tailwind CSS.
  * Pages implemented: `index.html`, `encrypt.html`, `view.html`, `about.html`, `contact.html`, `donate.html`, and `404.html`.
  * Generated on-the-fly QR codes for secure link sharing.
  * Added smooth GSAP animations for the decryption sequence.
* **Legal & Privacy:** * Authored strict, transparent policies: `privacy.html`, `terms.html`, `disclaimer.html`, and `cookie-policy.html`.
* **SEO & PWA:**
  * Comprehensive Open Graph and Twitter card meta tags for all routes.
  * `sitemap.xml`, `robots.txt`, `site.webmanifest`, and `browserconfig.xml` to support native app installation and search engine indexing.
* **Open Source Community Files:**
  * Added `README.md`, `LICENSE` (MIT), `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `SUPPORT.md` to establish repository authority and welcome contributors.
