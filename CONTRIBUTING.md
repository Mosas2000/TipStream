# Contributing to TipStream

Thank you for your interest in contributing to TipStream.  This guide
covers the setup process, coding standards, and pull request workflow.

## Getting Started

1. **Fork the repository** and clone your fork.
2. Install dependencies:

   ```bash
   npm install            # root — contract tests
   cd frontend && npm install   # frontend
   ```

3. Set up local network credentials:

   ```bash
   cp settings/Mainnet.toml.example settings/Mainnet.toml   # if needed
   cp settings/Testnet.toml.example settings/Testnet.toml   # if needed
   ```

   Fill in your own mnemonics.  **Never commit real credentials.**

4. Install the pre-commit hook (optional but recommended):

   ```bash
   cp scripts/hooks/pre-commit .git/hooks/pre-commit
   chmod +x .git/hooks/pre-commit
   ```

## Development Workflow

### Smart Contracts

```bash
clarinet check          # syntax and type checking
npm test                # run Vitest contract tests on simnet
```

### Frontend

```bash
cd frontend
npm run dev             # local dev server at http://localhost:5173
npm run build           # production build
npm run lint            # ESLint
```

### Running Scripts

```bash
# Test a mainnet tip (requires funded wallet)
MNEMONIC="..." RECIPIENT="SP..." node scripts/test-contract.cjs
```

## Coding Standards

- **JavaScript/JSX**: follow the ESLint configuration in `frontend/eslint.config.js`.
- **Clarity**: use `clarinet check` with the analysis passes defined in `Clarinet.toml`.
- **Commits**: write clear, descriptive commit messages in imperative mood.
  Keep the subject line under 72 characters and add a body when context
  is needed.
- **No secrets in code.**  Use environment variables or local config
  files that are listed in `.gitignore`.

## Pull Request Process

1. Create a topic branch from `main`:

   ```bash
   git checkout -b fix/short-description
   ```

2. Make your changes in small, focused commits.
3. Ensure all tests pass (`npm test` at root, `npm run lint` in `frontend`).
4. Push your branch and open a pull request against `main`.
5. Fill in the PR template with a description, related issue number,
   and any deployment notes.
6. At least one maintainer review is required before merging.

## Security

If you discover a vulnerability, do **not** open a public issue.
Follow the responsible-disclosure process in [SECURITY.md](SECURITY.md).

## License

By contributing you agree that your contributions will be licensed
under the MIT License.
