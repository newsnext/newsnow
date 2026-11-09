# NewsNow Daily Docker Schedule Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install a native macOS schedule that keeps the NewsNow Compose service running every day from 5:00 AM until 10:00 AM local time and stopped outside that window.

**Architecture:** An idempotent shell script reconciles the `newsnow` service with the current local hour. A per-user LaunchAgent invokes that script at 5:00 AM, 10:00 AM, and when the agent loads; installer and uninstaller scripts manage the generated plist and launchd lifecycle.

**Tech Stack:** POSIX shell/Zsh-compatible scripts, Docker Compose v2, macOS `launchd`/`launchctl`, `plutil`.

**Spec:** `docs/superpowers/specs/2026-10-24-newsnow-daily-schedule-design.md`

## Global Constraints

- Run every day, including weekends, from 5:00 AM through 9:59:59 AM in the Mac's local timezone.
- Control only the `newsnow` Compose service; never stop Docker Desktop or unrelated containers.
- Docker Desktop must already be running.
- Scripts must work regardless of the caller's current directory.
- Repeated reconciliation, installation, and removal must be safe.
- Generated configuration must use absolute paths because LaunchAgents have a restricted `PATH`.

## Review Focus

- `date +%H` emits leading-zero hours such as `05` and `09`; tests must prove these values start the service rather than failing numeric parsing.
- A missing or non-executable Docker CLI must produce a clear failure without partially installing the LaunchAgent.
- Repository, Docker, log, and LaunchAgent paths containing spaces or XML metacharacters must be encoded safely in the generated plist.
- Reinstalling over an existing plist must unload and replace the single existing agent rather than creating a duplicate.
- A missed 5:00 AM event followed by agent loading at an in-window hour must start NewsNow; loading outside the window must stop it.

---

### Task 1: Time-window reconciliation

**Files:**
- Create: `scripts/newsnow-schedule.sh`
- Create: `test/newsnow-schedule.test.sh`

**Interfaces:**
- Consumes: `docker compose` and the repository's `docker-compose.yml` service named `newsnow`.
- Produces: executable `scripts/newsnow-schedule.sh`; optional test/control environment variables `NEWSNOW_SCHEDULE_HOUR` and `NEWSNOW_DOCKER_BIN`; exit status `0` on a successful reconciliation and non-zero with a diagnostic on invalid input or Docker failure.

- [ ] **Step 1: Write failing boundary and command-selection tests**

In `test/newsnow-schedule.test.sh`, create a temporary fake Docker executable that records all arguments, invoke the scheduler from a directory outside the repository, and assert:

- `NEWSNOW_SCHEDULE_HOUR=04` records `compose --project-directory <absolute-repository-path> stop newsnow`.
- Hours `05` and `09` each record `compose --project-directory <absolute-repository-path> up -d newsnow`.
- Hour `10` records `compose --project-directory <absolute-repository-path> stop newsnow`.
- An invalid hour such as `24` exits non-zero, prints a clear invalid-hour diagnostic, and never invokes Docker.
- A missing `NEWSNOW_DOCKER_BIN` exits non-zero with a Docker-not-found diagnostic.
- A fake Docker failure is propagated as a non-zero scheduler exit.

- [ ] **Step 2: Run the scheduler test and verify it fails**

Run: `bash test/newsnow-schedule.test.sh`

Expected: FAIL because `scripts/newsnow-schedule.sh` does not exist.

- [ ] **Step 3: Implement the minimal reconciliation script**

Create executable `scripts/newsnow-schedule.sh` with strict shell error handling. Resolve the repository from the script location, accept `NEWSNOW_SCHEDULE_HOUR` only as a test/control override, otherwise use `date +%H`, validate the hour as exactly `00` through `23`, resolve Docker from `NEWSNOW_DOCKER_BIN` or `command -v docker`, and invoke the exact Compose commands asserted above. Emit a timestamped start/stop message before executing Docker.

- [ ] **Step 4: Run the scheduler test and verify it passes**

Run: `bash test/newsnow-schedule.test.sh`

Expected: PASS with a final summary indicating all scheduler cases passed.

- [ ] **Step 5: Run a syntax check**

Run: `bash -n scripts/newsnow-schedule.sh test/newsnow-schedule.test.sh`

Expected: exit status `0` and no output.

- [ ] **Step 6: Commit the reconciliation unit**

```bash
git add scripts/newsnow-schedule.sh test/newsnow-schedule.test.sh
git commit -m "feat: add NewsNow schedule reconciler"
```

### Task 2: LaunchAgent installation lifecycle and documentation

**Files:**
- Create: `scripts/install-newsnow-schedule.sh`
- Create: `scripts/uninstall-newsnow-schedule.sh`
- Create: `test/newsnow-launchagent.test.sh`
- Modify: `README.md` under the Docker Deployment section

**Interfaces:**
- Consumes: executable `scripts/newsnow-schedule.sh` from Task 1, absolute Docker path, current user ID, and macOS `launchctl`/`plutil`.
- Produces: generated per-user plist at `~/Library/LaunchAgents/com.newsnow.schedule.plist`; label `com.newsnow.schedule`; logs at `~/Library/Logs/NewsNow/schedule.stdout.log` and `schedule.stderr.log`; executable installer and uninstaller scripts. Test overrides: `NEWSNOW_LAUNCH_AGENTS_DIR`, `NEWSNOW_LOG_DIR`, `NEWSNOW_LAUNCHCTL_BIN`, `NEWSNOW_DOCKER_BIN`, and `NEWSNOW_UID`.

- [ ] **Step 1: Write failing installation and removal tests**

In `test/newsnow-launchagent.test.sh`, use temporary LaunchAgents/log directories plus fake Docker and `launchctl` executables. Assert that installation:

- Refuses a missing or non-executable Docker path before writing a plist or calling `launchctl`.
- Creates exactly `com.newsnow.schedule.plist` and passes `plutil -lint`.
- Generates `RunAtLoad=true`, two `StartCalendarInterval` entries for hours `5` and `10`, the schedule script's absolute path, the absolute Docker path, and stdout/stderr log paths.
- Correctly represents fixture paths containing spaces and `&` after plist parsing.
- Creates the log directory.
- Calls `bootout gui/<uid> <plist>` when replacing an existing installation, tolerates a not-loaded result, then calls `bootstrap gui/<uid> <plist>` and `kickstart -k gui/<uid>/com.newsnow.schedule`.
- Reinstallation still leaves one plist and one configured label.

Assert that uninstallation:

- Calls `bootout gui/<uid> <plist>`, tolerates an already-unloaded agent, and removes the plist.
- Leaves the log directory and files untouched.
- Does not call Docker or change the current NewsNow container state.

- [ ] **Step 2: Run the LaunchAgent test and verify it fails**

Run: `bash test/newsnow-launchagent.test.sh`

Expected: FAIL because the installer and uninstaller do not exist.

- [ ] **Step 3: Implement the installer**

Create executable `scripts/install-newsnow-schedule.sh`. Resolve all production defaults from the current user and script location, validate Docker before writing, safely XML-encode every dynamic plist string, generate the exact label/triggers/paths from the Interfaces block, validate the result with `plutil -lint`, replace the agent with modern per-user `launchctl bootout`/`bootstrap`, and use `kickstart -k` for immediate reconciliation.

- [ ] **Step 4: Implement the uninstaller**

Create executable `scripts/uninstall-newsnow-schedule.sh`. Resolve the same plist path, boot out the per-user label if present, remove only the generated plist, keep logs and container state, and succeed when already uninstalled.

- [ ] **Step 5: Run lifecycle tests and verify they pass**

Run: `bash test/newsnow-launchagent.test.sh`

Expected: PASS with a final summary indicating all LaunchAgent lifecycle cases passed.

- [ ] **Step 6: Add operator documentation**

Extend `README.md` immediately after Docker Deployment with a macOS Daily Schedule subsection containing:

- The every-day 5:00 AM to 10:00 AM local-time behavior.
- The Docker Desktop prerequisite.
- Install command: `./scripts/install-newsnow-schedule.sh`.
- Manual reconciliation command: `./scripts/newsnow-schedule.sh`.
- Status command: `launchctl print gui/$(id -u)/com.newsnow.schedule`.
- Both log paths.
- Uninstall command: `./scripts/uninstall-newsnow-schedule.sh`.
- The wake/login behavior and statement that only the `newsnow` service is controlled.

- [ ] **Step 7: Run all static and behavior checks**

Run: `bash -n scripts/newsnow-schedule.sh scripts/install-newsnow-schedule.sh scripts/uninstall-newsnow-schedule.sh test/newsnow-schedule.test.sh test/newsnow-launchagent.test.sh`

Expected: exit status `0` and no output.

Run: `bash test/newsnow-schedule.test.sh && bash test/newsnow-launchagent.test.sh`

Expected: both test summaries report PASS.

- [ ] **Step 8: Commit the installation lifecycle**

```bash
git add scripts/install-newsnow-schedule.sh scripts/uninstall-newsnow-schedule.sh test/newsnow-launchagent.test.sh README.md
git commit -m "feat: schedule NewsNow with launchd"
```

### Task 3: Activate and verify the live schedule

**Files:**
- Runtime create: `~/Library/LaunchAgents/com.newsnow.schedule.plist`
- Runtime create: `~/Library/Logs/NewsNow/schedule.stdout.log`
- Runtime create: `~/Library/Logs/NewsNow/schedule.stderr.log`

**Interfaces:**
- Consumes: the installer and generated label from Task 2.
- Produces: a loaded per-user LaunchAgent and a live NewsNow service state matching the current local hour.

- [ ] **Step 1: Install the LaunchAgent**

Run: `./scripts/install-newsnow-schedule.sh`

Expected: the installer reports the plist path, loaded label, and whether immediate reconciliation started or stopped NewsNow.

- [ ] **Step 2: Validate the installed plist**

Run: `plutil -lint "$HOME/Library/LaunchAgents/com.newsnow.schedule.plist"`

Expected: `OK`.

- [ ] **Step 3: Verify launchd registration**

Run: `launchctl print "gui/$(id -u)/com.newsnow.schedule"`

Expected: exit status `0`, label `com.newsnow.schedule`, and calendar intervals for hours `5` and `10`.

- [ ] **Step 4: Verify live service state**

Run: `docker compose ps newsnow`

Expected: between 5:00 AM and 9:59:59 AM, service status is running; at all other times, service status is stopped/not running.

- [ ] **Step 5: Inspect reconciliation logs**

Run: `tail -n 20 "$HOME/Library/Logs/NewsNow/schedule.stdout.log" "$HOME/Library/Logs/NewsNow/schedule.stderr.log"`

Expected: a timestamped reconciliation message and no unexpected error.
