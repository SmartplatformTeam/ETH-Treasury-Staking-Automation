## Summary

Describe what changed and why.

## Scope

- docs
- web
- api
- worker
- packages
- `infra/obol-cdvn`

## Validation

List what you ran and what passed.

```bash
pnpm lint
pnpm typecheck
pnpm build
scripts/check-public-repo-safety.sh
```

Add any extra script validation such as:

```bash
bash -n infra/obol-cdvn/scripts/<script>.sh
```

## Docs Updated

List the documents you updated, or explicitly state that no docs were needed.

Typical docs to check:

- `README.md`
- `docs/reading-order.md`
- `docs/repo-guide.md`
- `docs/cdvn-runtime-handoff.md`

## Runtime / Approval Impact

If relevant, explain:

- whether automation scope changed
- whether approval boundaries changed
- whether any secret-handling behavior changed
- whether public repo safety rules changed

## Public-Safe Check

Confirm that this PR does not include:

- real `cluster.yml` or `hosts.yml`
- real approval files
- rendered runtime output
- `.charon` artifacts
- `jwt.hex`
- cert / key / CA
- real host addresses or internal URLs

If any of the above are involved, stop and move them out of the public repo.
