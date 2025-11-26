# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          | End of Life |
| ------- | ------------------ | ----------- |
| 1.x.x   | :white_check_mark: | TBD         |
| 0.x.x   | :x:                | 2025-12-31  |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

### 1. **DO NOT** Open a Public Issue

Please **do not** report security vulnerabilities through public GitHub issues, discussions, or pull requests.

### 2. Report Privately

Send a detailed report to: **security@cyber-sheet.dev**

Include the following information:
- Type of vulnerability (XSS, injection, DoS, etc.)
- Full paths of affected source files
- Location of the affected code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact assessment (what an attacker could do)
- Suggested fix (if you have one)

### 3. Response Timeline

- **Initial Response**: Within 48 hours
- **Vulnerability Confirmation**: Within 7 days
- **Fix Development**: Within 30 days (critical), 90 days (high/medium)
- **Public Disclosure**: After fix is released and users have time to update

### 4. Security Advisory Process

1. We will acknowledge receipt of your report
2. We will investigate and confirm the vulnerability
3. We will develop and test a fix
4. We will release a security patch
5. We will publish a security advisory (GitHub Security Advisories)
6. We will credit you in the advisory (unless you prefer to remain anonymous)

## Security Best Practices

### For Library Users

1. **Always use the latest version**
   ```bash
   npm update @cyber-sheet/core @cyber-sheet/renderer-canvas
   ```

2. **Enable dependency scanning**
   ```bash
   npm audit
   ```

3. **Validate user input before passing to Cyber Sheet**
   - Sanitize CSV/Excel imports
   - Validate formula inputs
   - Escape HTML in cell values

4. **Use Content Security Policy (CSP)**
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="default-src 'self'; script-src 'self'">
   ```

5. **Implement authentication for collaboration features**
   - Never expose collaboration WebSocket URLs publicly
   - Use secure WebSocket (wss://) in production
   - Validate user permissions server-side

### For Contributors

1. **Never commit secrets**
   - No API keys, passwords, or tokens
   - Use environment variables for sensitive data
   - Review `.gitignore` before committing

2. **Follow secure coding practices**
   - Validate all inputs
   - Sanitize outputs (prevent XSS)
   - Use parameterized queries (prevent injection)
   - Avoid `eval()` and `Function()` constructors

3. **Keep dependencies updated**
   - Run `npm audit` before submitting PRs
   - Fix high/critical vulnerabilities immediately
   - Update dependencies regularly

4. **Run security tests**
   ```bash
   npm run test:security
   npm audit --audit-level=high
   ```

## Known Security Considerations

### 1. Formula Engine

The formula engine evaluates expressions but does **not** use `eval()`. It uses a safe parser and interpreter. However:

- ⚠️ Complex formulas may cause performance issues (DoS risk)
- ✅ Mitigation: Formula execution timeout (default: 5 seconds)
- ✅ Mitigation: Maximum formula depth limit (default: 100)

### 2. File Import/Export

When importing CSV, Excel, or other files:

- ⚠️ Large files may cause memory exhaustion (DoS risk)
- ⚠️ Malicious files may contain embedded scripts
- ✅ Mitigation: File size limits (default: 50MB)
- ✅ Mitigation: Content sanitization on import
- ✅ Mitigation: Virus scanning recommended for production

### 3. Collaboration Engine

Realtime collaboration uses WebSockets:

- ⚠️ Unauthorized users may intercept or modify data
- ⚠️ Malicious users may flood with operations (DoS risk)
- ✅ Mitigation: Server-side authentication required
- ✅ Mitigation: Rate limiting on operations
- ✅ Mitigation: CRDT conflict resolution prevents data corruption

### 4. Cell Rendering

Cell values are rendered to canvas/DOM:

- ⚠️ HTML injection in cell values (XSS risk)
- ✅ Mitigation: All cell values are escaped before rendering
- ✅ Mitigation: No `innerHTML` usage, only `textContent`

## Vulnerability Disclosure History

### 2024

No vulnerabilities reported.

### 2025

No vulnerabilities reported.

We will maintain a public record of all disclosed vulnerabilities and fixes here.

## Security Tooling

We use the following tools to maintain security:

- **npm audit**: Automated dependency vulnerability scanning
- **Snyk**: Advanced vulnerability detection and monitoring
- **Dependabot**: Automated dependency updates
- **GitHub Security Advisories**: Vulnerability tracking and disclosure
- **CodeQL**: Static code analysis for security issues

## Security Bounty Program

We do not currently offer a bug bounty program, but we deeply appreciate security researchers who responsibly disclose vulnerabilities. We will:

- Credit you in our security advisories
- Mention you in our release notes
- Send you Cyber Sheet swag (stickers, t-shirts)
- Provide a recommendation letter upon request

## Compliance

Cyber Sheet follows these security standards:

- **OWASP Top 10**: Protection against common web vulnerabilities
- **NIST Cybersecurity Framework**: Risk management best practices
- **CWE/SANS Top 25**: Most dangerous software weaknesses

## Contact

- **Security Issues**: security@cyber-sheet.dev
- **General Support**: support@cyber-sheet.dev
- **GitHub Discussions**: https://github.com/cyber-sheet/excel/discussions

---

**Last Updated**: November 17, 2025  
**Version**: 1.0.0
