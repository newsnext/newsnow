#!/bin/bash

set -u

repo_dir=$(cd "$(dirname "$0")/.." && pwd -P)
installer="$repo_dir/scripts/install-newsnow-schedule.sh"
uninstaller="$repo_dir/scripts/uninstall-newsnow-schedule.sh"
scheduler="$repo_dir/scripts/newsnow-schedule.sh"
test_dir=$(mktemp -d "${TMPDIR:-/tmp}/newsnow launch & test.XXXXXX")
launch_agents_dir="$test_dir/Launch Agents & Schedules"
log_dir="$test_dir/Logs & Output"
bin_dir="$test_dir/bin"
fake_docker="$bin_dir/docker fake & helper"
fake_docker_no_compose="$bin_dir/docker without compose"
fake_launchctl="$bin_dir/launchctl fake"
launchctl_log="$test_dir/launchctl.log"
docker_log="$test_dir/docker.log"
output_log="$test_dir/output.log"
plist="$launch_agents_dir/com.newsnow.schedule.plist"
test_uid=501
failures=0

cleanup() {
  rm -rf "$test_dir"
}
trap cleanup EXIT

mkdir -p "$bin_dir"
expected_runtime_path="$(cd "$bin_dir" && pwd -P):/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

cat >"$fake_launchctl" <<'EOF'
#!/bin/bash
printf '%s\n' "$*" >>"$NEWSNOW_LAUNCHCTL_LOG"
if [ "${1:-}" = "bootout" ]; then
  exit "${FAKE_BOOTOUT_EXIT:-0}"
fi
if [ "${1:-}" = "print" ]; then
  exit "${FAKE_PRINT_EXIT:-0}"
fi
exit 0
EOF
chmod +x "$fake_launchctl"

fail() {
  local message=$1
  printf 'FAIL: %s\n' "$message" >&2
  failures=$((failures + 1))
}

assert_status() {
  local expected=$1
  local actual=$2
  local description=$3
  if [ "$actual" -ne "$expected" ]; then
    fail "$description (expected status $expected, got $actual)"
  fi
}

assert_nonzero_status() {
  local actual=$1
  local description=$2
  if [ "$actual" -eq 0 ]; then
    fail "$description (expected non-zero status)"
  fi
}

assert_equals() {
  local expected=$1
  local actual=$2
  local description=$3
  if [ "$actual" != "$expected" ]; then
    fail "$description (expected '$expected', got '$actual')"
  fi
}

file_contents() {
  local path=$1
  if [ -f "$path" ]; then
    cat "$path"
  fi
}

run_installer() {
  local docker_bin=$1
  local bootout_exit=${2:-0}

  : >"$output_log"
  NEWSNOW_LAUNCH_AGENTS_DIR="$launch_agents_dir" \
    NEWSNOW_LOG_DIR="$log_dir" \
    NEWSNOW_LAUNCHCTL_BIN="$fake_launchctl" \
    NEWSNOW_LAUNCHCTL_LOG="$launchctl_log" \
    NEWSNOW_DOCKER_BIN="$docker_bin" \
    NEWSNOW_DOCKER_LOG="$docker_log" \
    NEWSNOW_UID="$test_uid" \
    FAKE_BOOTOUT_EXIT="$bootout_exit" \
    "$installer" >"$output_log" 2>&1
}

run_uninstaller() {
  local bootout_exit=${1:-0}
  local print_exit=${2:-0}

  : >"$output_log"
  NEWSNOW_LAUNCH_AGENTS_DIR="$launch_agents_dir" \
    NEWSNOW_LOG_DIR="$log_dir" \
    NEWSNOW_LAUNCHCTL_BIN="$fake_launchctl" \
    NEWSNOW_LAUNCHCTL_LOG="$launchctl_log" \
    NEWSNOW_UID="$test_uid" \
    FAKE_BOOTOUT_EXIT="$bootout_exit" \
    FAKE_PRINT_EXIT="$print_exit" \
    "$uninstaller" >"$output_log" 2>&1
}

# Missing Docker must fail before installation has side effects.
: >"$launchctl_log"
run_installer "$bin_dir/missing-docker"
status=$?
assert_nonzero_status "$status" "installer rejects a missing Docker executable"
if ! grep -Eiq 'docker.*(not found|not executable)|missing.*docker' "$output_log"; then
  fail "installer explains that Docker is missing or not executable"
fi
if [ -e "$plist" ]; then
  fail "missing Docker does not create a plist"
fi
assert_equals "" "$(file_contents "$launchctl_log")" "missing Docker does not invoke launchctl"

# Docker without Compose must also fail before installation has side effects.
cat >"$fake_docker_no_compose" <<'EOF'
#!/bin/bash
exit 44
EOF
chmod +x "$fake_docker_no_compose"
: >"$launchctl_log"
run_installer "$fake_docker_no_compose"
status=$?
assert_nonzero_status "$status" "installer rejects Docker without Compose support"
if ! grep -Eiq 'docker compose|compose.*(not found|not available|unavailable)' "$output_log"; then
  fail "installer explains that Docker Compose is unavailable"
fi
if [ -e "$plist" ]; then
  fail "missing Docker Compose support does not create a plist"
fi
assert_equals "" "$(file_contents "$launchctl_log")" "missing Docker Compose support does not invoke launchctl"

# Valid installation with paths that require XML escaping.
cat >"$fake_docker" <<'EOF'
#!/bin/bash
printf '%s\n' "$*" >>"$NEWSNOW_DOCKER_LOG"
EOF
chmod +x "$fake_docker"
: >"$launchctl_log"
NEWSNOW_DOCKER_LOG="$docker_log" run_installer "$fake_docker" 5
status=$?
assert_status 0 "$status" "installer succeeds when Docker and launchctl are available"

if [ ! -f "$plist" ]; then
  fail "installer creates com.newsnow.schedule.plist"
else
  if ! plutil -lint "$plist" >/dev/null; then
    fail "generated plist passes plutil validation"
  fi

  assert_equals "com.newsnow.schedule" "$(/usr/libexec/PlistBuddy -c 'Print :Label' "$plist")" "plist uses the expected label"
  assert_equals "true" "$(/usr/libexec/PlistBuddy -c 'Print :RunAtLoad' "$plist")" "plist reconciles when loaded"
  assert_equals "5" "$(/usr/libexec/PlistBuddy -c 'Print :StartCalendarInterval:0:Hour' "$plist")" "plist schedules the start boundary"
  assert_equals "10" "$(/usr/libexec/PlistBuddy -c 'Print :StartCalendarInterval:1:Hour' "$plist")" "plist schedules the stop boundary"
  assert_equals "$scheduler" "$(/usr/libexec/PlistBuddy -c 'Print :ProgramArguments:0' "$plist")" "plist runs the repository scheduler by absolute path"
  assert_equals "$fake_docker" "$(/usr/libexec/PlistBuddy -c 'Print :EnvironmentVariables:NEWSNOW_DOCKER_BIN' "$plist")" "plist preserves the Docker path including XML metacharacters"
  assert_equals "$expected_runtime_path" "$(/usr/libexec/PlistBuddy -c 'Print :EnvironmentVariables:PATH' "$plist")" "plist gives Docker access to credential helpers and system commands"
  assert_equals "$log_dir/schedule.stdout.log" "$(/usr/libexec/PlistBuddy -c 'Print :StandardOutPath' "$plist")" "plist preserves the stdout log path"
  assert_equals "$log_dir/schedule.stderr.log" "$(/usr/libexec/PlistBuddy -c 'Print :StandardErrorPath' "$plist")" "plist preserves the stderr log path"
fi

plist_count=$(find "$launch_agents_dir" -maxdepth 1 -type f -name '*.plist' 2>/dev/null | wc -l | tr -d ' ')
assert_equals "1" "$plist_count" "installation creates exactly one plist"
if [ ! -d "$log_dir" ]; then
  fail "installer creates the log directory"
fi

expected_install_calls=$(printf 'bootout gui/%s %s\nbootstrap gui/%s %s\nkickstart -k gui/%s/com.newsnow.schedule' \
  "$test_uid" "$plist" "$test_uid" "$plist" "$test_uid")
assert_equals "$expected_install_calls" "$(file_contents "$launchctl_log")" "installer replaces, loads, and immediately reconciles the agent"

# Reinstallation remains a single-agent operation.
: >"$launchctl_log"
NEWSNOW_DOCKER_LOG="$docker_log" run_installer "$fake_docker" 0
status=$?
assert_status 0 "$status" "reinstallation succeeds"
plist_count=$(find "$launch_agents_dir" -maxdepth 1 -type f -name '*.plist' 2>/dev/null | wc -l | tr -d ' ')
assert_equals "1" "$plist_count" "reinstallation leaves exactly one plist"
assert_equals "$expected_install_calls" "$(file_contents "$launchctl_log")" "reinstallation replaces the existing agent instead of duplicating it"

# Uninstallation removes only the agent configuration.
mkdir -p "$log_dir"
touch "$log_dir/schedule.stdout.log" "$log_dir/schedule.stderr.log"
: >"$launchctl_log"
: >"$docker_log"
run_uninstaller 5 0
status=$?
assert_nonzero_status "$status" "uninstaller reports an unload failure while the agent remains registered"
if [ ! -e "$plist" ]; then
  fail "uninstaller preserves the plist when the agent remains registered"
fi
expected_failed_uninstall_calls=$(printf 'bootout gui/%s %s\nprint gui/%s/com.newsnow.schedule' \
  "$test_uid" "$plist" "$test_uid")
assert_equals "$expected_failed_uninstall_calls" "$(file_contents "$launchctl_log")" "uninstaller checks whether a failed bootout left the agent registered"

: >"$launchctl_log"
run_uninstaller 5 1
status=$?
assert_status 0 "$status" "uninstaller tolerates an already-unloaded launchd result"
if [ -e "$plist" ]; then
  fail "uninstaller removes the generated plist"
fi
if [ ! -f "$log_dir/schedule.stdout.log" ] || [ ! -f "$log_dir/schedule.stderr.log" ]; then
  fail "uninstaller preserves scheduler logs"
fi
expected_unloaded_calls=$(printf 'bootout gui/%s %s\nprint gui/%s/com.newsnow.schedule' \
  "$test_uid" "$plist" "$test_uid")
assert_equals "$expected_unloaded_calls" "$(file_contents "$launchctl_log")" "uninstaller confirms an already-unloaded NewsNow agent"
assert_equals "" "$(file_contents "$docker_log")" "uninstaller does not invoke Docker"

: >"$launchctl_log"
run_uninstaller 5 1
status=$?
assert_status 0 "$status" "uninstaller succeeds when already uninstalled"
assert_equals "" "$(file_contents "$launchctl_log")" "already-uninstalled removal does not call launchctl"

if [ "$failures" -ne 0 ]; then
  printf '%s LaunchAgent test(s) failed\n' "$failures" >&2
  exit 1
fi

printf 'PASS: all NewsNow LaunchAgent lifecycle cases passed\n'
