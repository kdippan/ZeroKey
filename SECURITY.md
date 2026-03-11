# Security Policy

Security and privacy are the fundamental pillars of **ZeroKey**. We take vulnerabilities in our cryptographic pipeline, server infrastructure, and frontend application incredibly seriously. We deeply appreciate the ethical hacking community's efforts in keeping open-source tools secure.

## Supported Versions

Currently, we only provide security updates and patches for the latest deployment of the `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| `main`  | :white_check_mark: |
| Older   | :x:                |

## Threat Model & Scope

ZeroKey operates on a strict **Zero-Knowledge, Client-Side Encryption** model utilizing the Web Crypto API. 

**In Scope:**
* Flaws in the AES-256-GCM encryption/decryption logic.
* Vulnerabilities in the PBKDF2 key derivation implementation.
* Data leakage to the Supabase backend (e.g., plaintext payloads bypassing client-side encryption).
* Bugs that prevent the "Burn-After-Reading" (database deletion) protocol from executing.
* Cross-Site Scripting (XSS) or injection attacks on the frontend.

**Out of Scope:**
* **Endpoint Compromise:** Vulnerabilities resulting from malware, keyloggers, or malicious browser extensions installed on the user's local hardware. ZeroKey cannot protect data if the operating system itself is compromised before encryption occurs.
* Social engineering or phishing attacks against users.
* Denial of Service (DoS) attacks against the Supabase/Vercel infrastructure.

## Reporting a Vulnerability

If you discover a security vulnerability, please **DO NOT** open a public issue on GitHub. Exposing an exploit publicly before it is patched puts users at risk.

Instead, please report it privately through one of the following channels:

1. **Direct Email:** Reach out directly to the lead developer at `Dippan.connect@gmail.com`. Please include "[SECURITY]" in the subject line.
2. **Secure Contact Form:** Submit a detailed report via the official [ZeroKey Contact Page](https://zerokey.vercel.app/contact).

### What to include in your report:
* A detailed description of the vulnerability.
* The exact steps required to reproduce the issue.
* Information about the browser, operating system, or environment where the bug was discovered.
* (Optional) Proof of Concept (PoC) code or screenshots.

### Our Commitment:
* We will acknowledge receipt of your vulnerability report within **48 hours**.
* We will provide a timeline for addressing the issue and keep you updated on the progress.
* Once the vulnerability is resolved, we will publicly acknowledge your contribution (if you consent to be credited).

Thank you for helping keep the internet a safer, more private place.
