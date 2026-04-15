#!/bin/sh

set -eu

if [ -z "${WEB3SIGNER_URL:-}" ]; then
  echo "WEB3SIGNER_URL must be set for the web3signer overlay" >&2
  exit 1
fi

DATA_DIR="${LODESTAR_DATA_DIR:-/opt/data}"
mkdir -p "${DATA_DIR}"

set -- \
  node /usr/app/packages/cli/bin/lodestar validator \
  --dataDir="${DATA_DIR}" \
  --network="${NETWORK}" \
  --metrics=true \
  --metrics.address="0.0.0.0" \
  --metrics.port="${VC_PORT_METRICS:-5064}" \
  --beaconNodes="${BEACON_NODE_ADDRESS}" \
  --builder="${BUILDER_API_ENABLED}" \
  --builder.selection="${BUILDER_SELECTION}" \
  --distributed \
  --externalSigner.url="${WEB3SIGNER_URL}"

if [ "${WEB3SIGNER_FETCH:-true}" = "true" ]; then
  set -- "$@" \
    --externalSigner.fetch \
    --externalSigner.fetchInterval="${WEB3SIGNER_FETCH_INTERVAL_MS:-384000}"
else
  if [ -z "${WEB3SIGNER_PUBLIC_KEYS:-}" ]; then
    echo "WEB3SIGNER_PUBLIC_KEYS must be set when WEB3SIGNER_FETCH=false" >&2
    exit 1
  fi

  set -- "$@" --externalSigner.pubkeys="${WEB3SIGNER_PUBLIC_KEYS}"
fi

exec "$@"
