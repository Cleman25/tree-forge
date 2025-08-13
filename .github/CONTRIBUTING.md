## Flow

- feature/* → PR → dev → PR → staging → PR → main
- `staging`: auto prerelease (x.y.z-rc.N) on push (npm tag `next`)
- `main`: Release Please → merge Release PR → npm `latest`

## Commit

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Scope examples: `cli`, `parser`, `detector`, `templates`, `ci`

## Setup

```sh
npm ci
npm run build
npm test
```

## PR Checklist

* CI green on matrix
* Tests added/updated
* If breaking change, document in PR body
