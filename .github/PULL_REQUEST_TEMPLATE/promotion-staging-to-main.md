# .github/PULL_REQUEST_TEMPLATE/promotion-staging-to-main.md

## Promote staging → main

- [ ] RC validated
- [ ] No open blockers on staging

Post-merge (auto):

- Release Please opens Release PR on main
- Merge Release PR → tag + GitHub Release
- `publish.yml` publishes to npm `latest`

Resolves: #
