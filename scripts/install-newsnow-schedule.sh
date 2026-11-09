#!/bin/bash

set -euo pipefail

label="com.newsnow.schedule"
script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
scheduler="$script_dir/newsnow-schedule.sh"
launch_agents_dir=${NEWSNOW_LAUNCH_AGENTS_DIR:-"$HOME/Library/LaunchAgents"}
log_dir=${NEWSNOW_LOG_DIR:-"$HOME/Library/Logs/NewsNow"}
plist="$launch_agents_dir/$label.plist"
user_id=${NEWSNOW_UID:-$(id -u)}
launchctl_bin=${NEWSNOW_LAUNCHCTL_BIN:-$(command -v launchctl || true)}
docker_bin=${NEWSNOW_DOCKER_BIN:-$(command -v docker || true)}

xml_escape() {
  printf '%s' "$1" | sed \
    -e 's/&/\&amp;/g' \
    -e 's/</\&lt;/g' \
    -e 's/>/\&gt;/g' \
    -e 's/"/\&quot;/g' \
    -e "s/'/\&apos;/g"
}

if [ -z "$docker_bin" ] || [ ! -x "$docker_bin" ]; then
  printf 'Docker executable not found or not executable: %s\n' "${docker_bin:-<unset>}" >&2
  exit 3
fi

if ! "$docker_bin" compose version >/dev/null 2>&1; then
  printf 'Docker Compose is unavailable through: %s\n' "$docker_bin" >&2
  exit 7
fi

docker_dir=$(cd "$(dirname "$docker_bin")" && pwd -P)
runtime_path="$docker_dir:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

if [ ! -x "$scheduler" ]; then
  printf 'NewsNow scheduler is not executable: %s\n' "$scheduler" >&2
  exit 4
fi

if [ -z "$launchctl_bin" ] || [ ! -x "$launchctl_bin" ]; then
  printf 'launchctl executable not found or not executable: %s\n' "${launchctl_bin:-<unset>}" >&2
  exit 5
fi

case "$user_id" in
  ''|*[!0-9]*)
    printf 'Invalid user ID: %s\n' "$user_id" >&2
    exit 6
    ;;
esac

mkdir -p "$launch_agents_dir" "$log_dir"

temp_plist="$plist.tmp.$$"
cleanup() {
  rm -f "$temp_plist"
}
trap cleanup EXIT

scheduler_xml=$(xml_escape "$scheduler")
docker_xml=$(xml_escape "$docker_bin")
runtime_path_xml=$(xml_escape "$runtime_path")
stdout_xml=$(xml_escape "$log_dir/schedule.stdout.log")
stderr_xml=$(xml_escape "$log_dir/schedule.stderr.log")

cat >"$temp_plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$label</string>
  <key>ProgramArguments</key>
  <array>
    <string>$scheduler_xml</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NEWSNOW_DOCKER_BIN</key>
    <string>$docker_xml</string>
    <key>PATH</key>
    <string>$runtime_path_xml</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>StartCalendarInterval</key>
  <array>
    <dict>
      <key>Hour</key>
      <integer>5</integer>
      <key>Minute</key>
      <integer>0</integer>
    </dict>
    <dict>
      <key>Hour</key>
      <integer>10</integer>
      <key>Minute</key>
      <integer>0</integer>
    </dict>
  </array>
  <key>StandardOutPath</key>
  <string>$stdout_xml</string>
  <key>StandardErrorPath</key>
  <string>$stderr_xml</string>
</dict>
</plist>
EOF

plutil -lint "$temp_plist" >/dev/null
mv "$temp_plist" "$plist"

"$launchctl_bin" bootout "gui/$user_id" "$plist" >/dev/null 2>&1 || true
"$launchctl_bin" bootstrap "gui/$user_id" "$plist"
"$launchctl_bin" kickstart -k "gui/$user_id/$label"

printf 'Installed %s\n' "$plist"
printf 'Loaded %s and requested immediate schedule reconciliation.\n' "$label"
