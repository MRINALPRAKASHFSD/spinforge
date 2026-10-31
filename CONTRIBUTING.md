# Contributing to SPINFORGE

Thank you for contributing to SPINFORGE! This project is built entirely on native Web Standards and ES Modules without runtime bundling.

## Development Workflow

1. Fork or branch from `main`.
2. Keep all internal imports using explicit relative paths with `.js` extensions.
3. Maintain zero external runtime dependencies.
4. Run all unit and integration tests before committing:
   ```bash
   npm test
   ```
5. Follow conventional commit conventions:
   - `feat(scope): description`
   - `fix(scope): description`
   - `test(scope): description`
   - `docs(scope): description`
   - `refactor(scope): description`
6. Open a pull request against `main` (or the appropriate feature branch) using the pull request template.

## Testing Guidelines

- Write unit tests using Node.js's native test runner (`node:test` and `node:assert`).
- Verify that no circular dependencies are introduced (`tests/circular-dependencies.test.js`).
- Ensure physics remains deterministic across varying framerates.
