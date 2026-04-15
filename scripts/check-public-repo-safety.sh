#!/bin/sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "${ROOT_DIR}"

FOUND=0

report_paths() {
  label="$1"
  shift

  paths="$("$@" || true)"
  if [ -n "${paths}" ]; then
    FOUND=1
    echo "[FAIL] ${label}"
    echo "${paths}" | sed 's/^/  - /'
  fi
}

report_paths "Temporary CDVN artifacts exist inside the repo" \
  find . -maxdepth 1 -type d \( -name '.tmp-cdvn-*' -o -name '.tmp-*' \) -print

report_paths "Real ops inventory files exist inside the public repo" \
  find infra/obol-cdvn/inventory -maxdepth 1 -type f \( -name 'cluster.yml' -o -name 'hosts.yml' \) -print

report_paths "Sensitive runtime files exist inside the repo" \
  find . \
    \( -path './node_modules' -o -path './.next' -o -path './.turbo' -o -path './dist' -o -path './coverage' \) -prune -o \
    \( -name 'charon-enr-private-key' -o -name 'cluster-lock.json' -o -name 'validator-pubkeys.txt' -o -name 'jwt.hex' -o -name 'charon-artifacts-staging.env' -o -name 'render-bundle.env' -o -name 'render-metadata.env' -o -name '.env' -o -name '*.pem' -o -name '*.key' -o -name '*.crt' -o -name '*.p12' -o -name '*.pfx' \) \
    -print

if command -v rg >/dev/null 2>&1; then
  report_paths "Non-example approval files or approved manifests were found" \
    rg -l --hidden --glob '!node_modules/**' --glob '!docs/**' --glob '!infra/obol-cdvn/scripts/*example.env' --glob '!scripts/check-public-repo-safety.sh' '^APPROVAL_STATUS=APPROVED$' .
fi

if [ "${FOUND}" -ne 0 ]; then
  echo
  echo "Public repo safety check failed."
  echo "Move real ops inputs outside the repo or remove the files before publishing."
  exit 1
fi

echo "Public repo safety check passed."
