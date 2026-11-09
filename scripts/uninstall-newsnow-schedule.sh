#!/bin/bash

set -euo pipefail

label="com.newsnow.schedule"
launch_agents_dir=${NEWSNOW_LAUNCH_AGENTS_DIR:-"$HOME/Library/LaunchAgents"}
plist="$launch_agents_dir/$label.plist"
user_id=${NEWSNOW_UID:-$(id -u)}
launchctl_bin=${NEWSNOW_LAUNCHCTL_BIN:-$(command -v launchctl || true)}

case "$user_id" in
  ''|*[!0-9]*)
    printf 'Invalid user ID: %s\n' "$user_id" >&2
    exit 6
    ;;
esac

if [ ! -e "$plist" ]; then
  printf 'NewsNow schedule is already uninstalled.\n'
  exit 0
fi

if [ -z "$launchctl_bin" ] || [ ! -x "$launchctl_bin" ]; then
  printf 'launchctl executable not found or not executable: %s\n' "${launchctl_bin:-<unset>}" >&2
  exit 5
fi

if ! "$launchctl_bin" bootout "gui/$user_id" "$plist" >/dev/null 2>&1; then
  if "$launchctl_bin" print "gui/$user_id/$label" >/dev/null 2>&1; then
    printf 'Could not unload %s; its plist was preserved at %s\n' "$label" "$plist" >&2
    exit 7
  fi
fi
rm -f "$plist"

printf 'Uninstalled %s. Existing logs and container state were preserved.\n' "$label"
