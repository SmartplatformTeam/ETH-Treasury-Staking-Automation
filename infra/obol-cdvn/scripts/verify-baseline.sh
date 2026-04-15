#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)"
BASELINE_DIR="${INFRA_DIR}/baseline"
UPSTREAM_DIR="${BASELINE_DIR}/upstream"
VERSION_FILE="${BASELINE_DIR}/VERSION"
ROOT_ENV_FILE="${INFRA_DIR}/../../.env.example"

required_files=(
  "${VERSION_FILE}"
  "${UPSTREAM_DIR}/docker-compose.yml"
  "${UPSTREAM_DIR}/compose-el.yml"
  "${UPSTREAM_DIR}/compose-cl.yml"
  "${UPSTREAM_DIR}/compose-vc.yml"
  "${UPSTREAM_DIR}/compose-mev.yml"
  "${UPSTREAM_DIR}/compose-debug.yml"
  "${UPSTREAM_DIR}/.env.sample.mainnet"
  "${UPSTREAM_DIR}/.env.sample.hoodi"
)

missing=0

for file in "${required_files[@]}"; do
  if [ ! -e "${file}" ]; then
    echo "Missing required baseline file: ${file}" >&2
    missing=1
  fi
done

if [ "${missing}" -ne 0 ]; then
  exit 1
fi

if [ -f "${UPSTREAM_DIR}/jwt/jwt.hex" ]; then
  echo "Sensitive default jwt file should not be mirrored under source control." >&2
  exit 1
fi

baseline_ref="$(grep '^UPSTREAM_REF=' "${VERSION_FILE}" | cut -d '=' -f 2-)"
env_ref="$(grep '^CDVN_BASELINE_VERSION=' "${ROOT_ENV_FILE}" | cut -d '=' -f 2-)"

if [ "${baseline_ref}" != "${env_ref}" ]; then
  echo ".env.example CDVN baseline version (${env_ref}) does not match pinned baseline (${baseline_ref})." >&2
  exit 1
fi

echo "Baseline verified: ${baseline_ref}"
