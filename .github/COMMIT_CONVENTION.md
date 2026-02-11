# Commit Message Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification for clear and structured commit history.

## Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (formatting, semicolons, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvements
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes to build system or dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

## Scopes

Common scopes in this project:
- **core**: Core spreadsheet engine
- **renderer**: Canvas rendering system
- **integrations**: Framework wrappers (React, Angular, Vue, Svelte)
- **utils**: Utility packages (io-xlsx, test-utils)
- **examples**: Example files and demos
- **docs**: Documentation

## Examples

### Feature
```
feat(core): add support for VLOOKUP formula

- Implement vertical lookup functionality
- Add caching for improved performance
- Include comprehensive test coverage

Closes #123
```

### Bug Fix
```
fix(renderer): correct cell border rendering in high DPI displays

Previously, borders appeared blurred on retina displays.
Now properly scales canvas context for device pixel ratio.

Fixes #456
```

### Documentation
```
docs(api): update formula API documentation

- Add examples for new formulas
- Clarify parameter types
- Include performance considerations
```

### Breaking Change
```
feat(core)!: change formula syntax to be Excel-compatible

BREAKING CHANGE: Formula functions now use uppercase names (SUM instead of sum)

Migration guide: Update all formula references to use uppercase function names.
```

## Best Practices

1. **Subject line** (first line):
   - Use imperative mood ("add" not "added")
   - Don't capitalize first letter after type
   - No period at the end
   - Keep under 72 characters

2. **Body** (optional):
   - Separate from subject with blank line
   - Explain what and why, not how
   - Use bullet points for multiple changes
   - Wrap at 72 characters

3. **Footer** (optional):
   - Reference issues: `Closes #123`, `Fixes #456`
   - Note breaking changes: `BREAKING CHANGE: description`

4. **Atomic commits**:
   - One logical change per commit
   - Ensure each commit builds successfully
   - Keep related changes together

5. **Scope usage**:
   - Use when the change affects a specific package
   - Omit for cross-cutting changes
   - Be consistent within the project

## Tools

Consider using:
- **commitlint**: Enforce commit message format
- **husky**: Git hooks for pre-commit validation
- **commitizen**: Interactive commit message helper

## Commit Message Template

To set up a commit template:

```bash
git config commit.template .github/.gitmessage
```

Create `.github/.gitmessage`:
```
# <type>(<scope>): <subject>
#
# <body>
#
# <footer>

# Type: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
# Scope: core, renderer, integrations, utils, examples, docs
# Subject: imperative mood, lowercase, no period, <72 chars
# Body: explain what and why (optional)
# Footer: issue references, breaking changes (optional)
```
