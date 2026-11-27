#!/bin/bash

set -euo pipefail

repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
hour=${NEWSNOW_SCHEDULE_HOUR:-$(date +%H)}

case "$hour" in
  0[0-9]|1[0-9]|2[0-3]) ;;
  *)
    printf 'Invalid schedule hour: %s (expected 00 through 23)\n' "$hour" >&2
    exit 2
    ;;
esac

docker_bin=${NEWSNOW_DOCKER_BIN:-}
if [ -z "$docker_bin" ]; then
  docker_bin=$(command -v docker || true)
fi

if [ -z "$docker_bin" ] || [ ! -x "$docker_bin" ]; then
  printf 'Docker executable not found or not executable: %s\n' "${docker_bin:-<unset>}" >&2
  exit 3
fi

timestamp=$(date '+%Y-%m-%d %H:%M:%S %Z')

case "$hour" in
  05|06|07|08|09)
    printf '[%s] Starting NewsNow for scheduled hour %s\n' "$timestamp" "$hour"
    exec "$docker_bin" compose --project-directory "$repo_dir" up -d newsnow
    ;;
  *)
    printf '[%s] Stopping NewsNow outside scheduled hours (current hour %s)\n' "$timestamp" "$hour"
    exec "$docker_bin" compose --project-directory "$repo_dir" stop newsnow
    ;;
esac
