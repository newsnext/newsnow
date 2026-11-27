#!/bin/bash

set -u

repo_dir=$(cd "$(dirname "$0")/.." && pwd -P)
scheduler="$repo_dir/scripts/newsnow-schedule.sh"
test_dir=$(mktemp -d "${TMPDIR:-/tmp}/newsnow-schedule-test.XXXXXX")
docker_log="$test_dir/docker.log"
output_log="$test_dir/output.log"
fake_docker="$test_dir/docker"
failures=0

cleanup() {
  rm -rf "$test_dir"
}
trap cleanup EXIT

cat >"$fake_docker" <<'EOF'
#!/bin/bash
printf '%s\n' "$*" >>"$NEWSNOW_DOCKER_LOG"
exit "${FAKE_DOCKER_EXIT:-0}"
EOF
chmod +x "$fake_docker"

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

assert_log_equals() {
  local expected=$1
  local description=$2
  local actual=""
  if [ -f "$docker_log" ]; then
    actual=$(cat "$docker_log")
  fi
  if [ "$actual" != "$expected" ]; then
    fail "$description (expected '$expected', got '$actual')"
  fi
}

run_scheduler() {
  local hour=$1
  local docker_bin=$2
  local fake_exit=${3:-0}

  : >"$docker_log"
  : >"$output_log"
  (
    cd /private/tmp || exit 1
    NEWSNOW_SCHEDULE_HOUR="$hour" \
      NEWSNOW_DOCKER_BIN="$docker_bin" \
      NEWSNOW_DOCKER_LOG="$docker_log" \
      FAKE_DOCKER_EXIT="$fake_exit" \
      "$scheduler"
  ) >"$output_log" 2>&1
}

for case in \
  "04|compose --project-directory $repo_dir stop newsnow" \
  "05|compose --project-directory $repo_dir up -d newsnow" \
  "09|compose --project-directory $repo_dir up -d newsnow" \
  "10|compose --project-directory $repo_dir stop newsnow"
do
  hour=${case%%|*}
  expected=${case#*|}
  run_scheduler "$hour" "$fake_docker"
  status=$?
  assert_status 0 "$status" "$hour selects the expected Compose action"
  assert_log_equals "$expected" "$hour invokes only the NewsNow service from the repository"
done

run_scheduler "24" "$fake_docker"
status=$?
assert_nonzero_status "$status" "invalid hour is rejected"
if ! grep -Eiq 'invalid.*hour|hour.*invalid' "$output_log"; then
  fail "invalid hour prints a clear diagnostic"
fi
assert_log_equals "" "invalid hour does not invoke Docker"

run_scheduler "05" "$test_dir/missing-docker"
status=$?
assert_nonzero_status "$status" "missing Docker executable is rejected"
if ! grep -Eiq 'docker.*(not found|not executable)|missing.*docker' "$output_log"; then
  fail "missing Docker executable prints a clear diagnostic"
fi
assert_log_equals "" "missing Docker executable is never invoked"

run_scheduler "05" "$fake_docker" 37
status=$?
if [ "$status" -ne 37 ]; then
  fail "Docker failure status is propagated (expected 37, got $status)"
fi

if [ "$failures" -ne 0 ]; then
  printf '%s scheduler test(s) failed\n' "$failures" >&2
  exit 1
fi

printf 'PASS: all NewsNow scheduler cases passed\n'
