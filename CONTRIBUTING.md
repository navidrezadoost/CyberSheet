# Contributing to CyberSheet

First off, thank you for considering contributing to CyberSheet! It's people like you that make the open-source community such a great place. We welcome any form of contribution, from reporting bugs and submitting feedback to writing code and improving documentation.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Coding Style](#coding-style)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Submitting a Pull Request](#submitting-a-pull-request)

## Code of Conduct

This project and everyone participating in it is governed by the [CyberSheet Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to `navid.rezadoost@gmail.com`.

## How Can I Contribute?

### Reporting Bugs

If you find a bug, please ensure the bug was not already reported by searching on GitHub under [Issues](https://github.com/navid-rezadoost/cyber-sheet-excel/issues).

If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/navid-rezadoost/cyber-sheet-excel/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample** or an **executable test case** demonstrating the expected behavior that is not occurring.

### Suggesting Enhancements

If you have an idea for an enhancement, please open an issue to discuss it. This allows us to coordinate our efforts and prevent duplication of work.

### Pull Requests

We love pull requests! If you're planning to implement a new feature or a major bug fix, please open an issue first to discuss your proposal.

## Development Setup

1.  **Fork** the repository on GitHub.
2.  **Clone** your fork locally:
    ```bash
    git clone https://github.com/your-username/cyber-sheet-excel.git
    cd cyber-sheet-excel
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Build all packages**:
    ```bash
    npm run build
    ```
5.  **Run tests**:
    ```bash
    npm test
    ```
6.  **Create a new branch** for your changes:
    ```bash
    git checkout -b feat/my-awesome-feature
    ```

## Coding Style

- **TypeScript**: We use TypeScript with strict settings. Please ensure your code is well-typed.
- **Linting**: We use ESLint for code style. Run `npm run lint` to check your code.
- **Formatting**: We use Prettier for code formatting. It's recommended to set up your editor to format on save.
- **Comments**: Please add comments to your code where it's not self-explanatory. For new features, consider adding documentation.

## Commit Message Guidelines

We use the [Conventional Commits](https://www.conventionalcommits.org/) specification. This allows for automated changelog generation and helps us keep the commit history clean.

A commit message should be structured as follows:

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

**Example:**

```
feat(renderer): add support for dashed borders
```

**Types:** `feat`, `fix`, `build`, `chore`, `ci`, `docs`, `perf`, `refactor`, `revert`, `style`, `test`.

## Submitting a Pull Request

1.  Ensure your code lints and all tests pass.
2.  Push your branch to your fork:
    ```bash
    git push origin feat/my-awesome-feature
    ```
3.  Open a pull request to the `main` branch of the original repository.
4.  Provide a clear description of your changes and link to any relevant issues.
5.  The project team will review your pull request and provide feedback.

Thank you for your contribution!
### Documentation

- Update README.md for significant changes
- Add JSDoc comments for new public APIs
- Update examples if adding new features

## Development Guidelines

### Architecture

Cyber Sheet is built as a monorepo with multiple packages:

- `packages/core`: Core spreadsheet functionality
- `packages/renderer-canvas`: Canvas-based rendering
- `packages/react`: React wrapper
- `packages/vue`: Vue wrapper
- `packages/angular`: Angular wrapper
- `packages/svelte`: Svelte wrapper

### Stability

We follow strict semantic versioning and maintain backward compatibility. See [VersionManager.ts](packages/core/src/VersionManager.ts) for details.

### Security

- Run `npm run security:audit` before committing
- Report security issues to [security@cyber-sheet.dev](mailto:security@cyber-sheet.dev)
- See [SECURITY.md](SECURITY.md) for details

## Getting Help

- **Documentation**: Check our [docs](https://cyber-sheet.dev/docs)
- **Discussions**: Use GitHub Discussions for questions
- **Issues**: Create issues for bugs and feature requests
- **Discord**: Join our community on Discord

## Recognition

Contributors will be recognized in our CHANGELOG.md and may be featured in our documentation. Significant contributions may lead to being listed as a maintainer.

Thank you for contributing to Cyber Sheet! 🚀
