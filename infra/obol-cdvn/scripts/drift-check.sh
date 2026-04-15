#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  drift-check.sh --render-dir <path> --host-name <name> --destination <path> [--fail-on-drift]

Examples:
  ./drift-check.sh --render-dir /tmp/cdvn-bundle --host-name operator-1 --destination /srv/cdvn/operator-1
EOF
}

RENDER_DIR=""
HOST_NAME=""
DESTINATION=""
FAIL_ON_DRIFT=0

while [ "$#" -gt 0 ]; do
  case "$1" in
    --render-dir)
      RENDER_DIR="${2:-}"
      shift 2
      ;;
    --host-name)
      HOST_NAME="${2:-}"
      shift 2
      ;;
    --destination)
      DESTINATION="${2:-}"
      shift 2
      ;;
    --fail-on-drift)
      FAIL_ON_DRIFT=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

[ -n "${RENDER_DIR}" ] || { usage >&2; exit 1; }
[ -n "${HOST_NAME}" ] || { usage >&2; exit 1; }
[ -n "${DESTINATION}" ] || { usage >&2; exit 1; }

HOST_RUNTIME_DIR="${RENDER_DIR}/hosts/${HOST_NAME}/runtime"
if [ ! -d "${HOST_RUNTIME_DIR}" ]; then
  echo "Rendered host runtime not found: ${HOST_RUNTIME_DIR}" >&2
  exit 1
fi

DRIFT_OUTPUT="$(rsync -ain --delete --exclude data/ --exclude .charon/ --exclude jwt/jwt.hex "${HOST_RUNTIME_DIR}/" "${DESTINATION}/" || true)"

if [ -z "${DRIFT_OUTPUT}" ]; then
  echo "No drift detected for ${HOST_NAME}"
  exit 0
fi

printf '%s\n' "${DRIFT_OUTPUT}"
if [ "${FAIL_ON_DRIFT}" -eq 1 ]; then
  exit 2
fi
