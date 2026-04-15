---
name: Bug report
about: Report a reproducible bug in the public-safe code, docs, or example automation flow
title: "[Bug] "
labels: bug
assignees: ""
---

## Summary

Describe the bug clearly.

Do not include any of the following in this issue:

- real `cluster.yml` or `hosts.yml`
- real approval files
- rendered runtime output
- `.charon` artifacts
- `jwt.hex`
- cert / key / CA
- internal URLs or real host addresses

If the issue is security-sensitive, do not use this template.
Follow `SECURITY.md` instead.

## Scope

- Area:
  - docs
  - web
  - api
  - worker
  - packages
  - `infra/obol-cdvn`
- Impact:
  - low
  - medium
  - high

## Steps To Reproduce

1. 
2. 
3. 

## Expected Behavior

Describe what you expected to happen.

## Actual Behavior

Describe what actually happened.

## Relevant Context

- Branch or commit:
- OS:
- Node version:
- pnpm version:

## Validation

List anything you already ran.

```bash
pnpm lint
pnpm typecheck
pnpm build
scripts/check-public-repo-safety.sh
```

## Additional Notes

Add logs or screenshots only if they are public-safe.
