# Contributing to ZeroKey

First off, thank you for considering contributing to ZeroKey! It's people like you who make the open-source community such an amazing place to learn, inspire, and create. 

ZeroKey is built by a student developer with a passion for privacy, and every contribution—whether it's fixing a bug, improving documentation, or proposing a new cryptographic feature—is deeply appreciated.

## 🛡️ Important: Security Vulnerabilities

If you find a security vulnerability, **PLEASE DO NOT** open a public issue. Exposing an exploit publicly puts our users at risk. Instead, please review our [Security Policy](SECURITY.md) and report the vulnerability directly to the developer.

## 💡 How Can I Contribute?

### 1. Reporting Bugs
If you spot a bug (that isn't a critical security flaw), please open an issue on GitHub. Include:
* A clear and descriptive title.
* Steps to reproduce the bug.
* The expected behavior vs. the actual behavior.
* Your browser and operating system.

### 2. Suggesting Enhancements
Have an idea to make ZeroKey better? We'd love to hear it! Open an issue and use the "Feature Request" label if available. Explain *why* this enhancement would be useful and how it aligns with ZeroKey's zero-knowledge, privacy-first mission.

### 3. Submitting Pull Requests (PRs)
Ready to write some code? Awesome! Please follow this workflow:

1. **Fork the repository** to your own GitHub account.
2. **Clone the project** to your local machine:
   ```bash
   git clone [https://github.com/YOUR-USERNAME/zerokey.git](https://github.com/YOUR-USERNAME/zerokey.git)

 * Create a branch for your feature or bug fix. Use a descriptive name:
  ```bash
 git checkout -b feature/awesome-new-encryption
```
or
```bash
 git checkout -b fix/mobile-ui-glitch
```
 * Make your changes. Keep your commits focused and provide clear commit messages.
 * Test your changes locally. Ensure that the Web Crypto API logic is intact and that the Tailwind UI hasn't broken on mobile screens.
 * Push your branch to your fork:
   git push origin feature/awesome-new-encryption

 * Open a Pull Request against the main branch of the original ZeroKey repository. Provide a clear description of what you've done and link to any relevant issues.
# 🧑‍💻 Coding Guidelines
To keep the codebase clean and maintainable, please adhere to the following principles:
 * Vanilla JavaScript: ZeroKey uses pure Vanilla JS to keep the bundle size small and the execution fast. Avoid introducing heavy frameworks (like React or Vue) or external libraries unless absolutely necessary and discussed beforehand.
 * Web Crypto API Only: For cryptographic operations, strictly rely on the native window.crypto.subtle API. Do not introduce third-party cryptography libraries (like CryptoJS) as they expand the attack surface.
 * Tailwind CSS: All styling should be done using utility classes provided by Tailwind CSS. Avoid writing custom CSS in style.css unless it's for complex animations or pseudo-elements that Tailwind can't easily handle.
 * Zero-Knowledge Principle: Any feature added must adhere to the rule that the server never sees plaintext data or decryption keys.
# 🤝 Code of Conduct
By participating in this project, you agree to maintain a welcoming, inclusive, and respectful environment for everyone. Harassment or abusive behavior will not be tolerated. We are here to learn from each other and build cool things.
Thank you for helping keep digital privacy accessible to everyone!

