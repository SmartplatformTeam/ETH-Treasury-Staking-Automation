#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib.sh
. "${SCRIPT_DIR}/lib.sh"

usage() {
  cat <<'EOF'
Usage:
  rollout.sh --render-dir <path> --host-name <name> --approval-file <path> [--destination <path>] [--execute]

Examples:
  ./rollout.sh --render-dir /tmp/cdvn-bundle --host-name operator-1 --approval-file ./rollout-approval.example.env
  ./rollout.sh --render-dir /tmp/cdvn-bundle --host-name operator-1 --approval-file ./approval.env --destination ubuntu@203.0.113.11:/opt/obol/cluster-a --execute
EOF
}

RENDER_DIR=""
HOST_NAME=""
APPROVAL_FILE=""
DESTINATION=""
EXECUTE=0

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
    --approval-file)
      APPROVAL_FILE="${2:-}"
      shift 2
      ;;
    --destination)
      DESTINATION="${2:-}"
      shift 2
      ;;
    --execute)
      EXECUTE=1
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
[ -n "${APPROVAL_FILE}" ] || { usage >&2; exit 1; }

require_rendered_host "${RENDER_DIR}" "${HOST_NAME}"

HOST_RUNTIME_DIR="$(render_host_runtime_dir "${RENDER_DIR}" "${HOST_NAME}")"
METADATA_FILE="$(render_host_metadata_file "${RENDER_DIR}" "${HOST_NAME}")"
validate_rollout_approval "${APPROVAL_FILE}" "${METADATA_FILE}" "${HOST_NAME}"

DEPLOYMENT_PATH="$(read_env_value "${METADATA_FILE}" "DEPLOYMENT_PATH")"

if [ -z "${DESTINATION}" ]; then
  DESTINATION="${DEPLOYMENT_PATH}"
fi

if [ -z "${DESTINATION}" ]; then
  echo "Destination is required when render metadata has no deployment path." >&2
  exit 1
fi

RSYNC_ARGS=(-a --delete --exclude data/ --exclude jwt/jwt.hex)
if [ "${EXECUTE}" -ne 1 ]; then
  RSYNC_ARGS=(-ain --delete --exclude data/ --exclude jwt/jwt.hex)
fi

echo "Rollout target: ${DESTINATION}"
echo "Approval file: ${APPROVAL_FILE}"
echo "Runtime dir: ${HOST_RUNTIME_DIR}"

rsync "${RSYNC_ARGS[@]}" "${HOST_RUNTIME_DIR}/" "${DESTINATION}/"
