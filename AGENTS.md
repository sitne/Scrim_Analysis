# Development Rules

- Use `npm` only.
- Work on a feature branch. Do not push directly to `master`.
- Keep changes small and atomic.
- Before changing code, document impact, risk, and rollback in the PR.
- Prisma schema changes must include migration impact.
- CI is the source of truth: `lint`, `typecheck`, `db:validate`, `test`, `build`, and `test:e2e` must pass.
- `npm run lint` checks changed source files against `master`; use `npm run lint:all` for repo-wide cleanup.
- Prefer low-risk E2E smoke coverage unless a stronger auth strategy is explicitly approved.
