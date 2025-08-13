# .github/PULL_REQUEST_TEMPLATE/promotion-dev-to-staging.md

## Promote dev → staging

- [ ] All PRs into dev are merged and CI is green
- [ ] Changelog noteworthy items collected

Post-merge (auto):

- staging push triggers prerelease
- npm publish with tag `next` (x.y.z-rc.N)
- GitHub Pre-release created

Resolves: #
