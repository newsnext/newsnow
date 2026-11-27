# NewsNow Daily Docker Schedule Design

## Intent

Run the Docker Compose `newsnow` service every day from 5:00 AM until 10:00 AM in the Mac's local timezone, while keeping it stopped outside that window. The schedule should recover sensibly when the Mac is restarted, logged into, or wakes after a scheduled event.

## Goals

- Start NewsNow at 5:00 AM every day, including weekends.
- Stop NewsNow at 10:00 AM every day.
- Reconcile the correct state when the LaunchAgent loads, so waking or logging in during the window starts NewsNow and doing so outside the window stops it.
- Control only the NewsNow Compose service; do not stop Docker Desktop or unrelated containers.
- Make installation, removal, and troubleshooting straightforward.

## Non-goals

- Starting or stopping Docker Desktop itself.
- Publishing NewsNow outside the Tailscale network.
- Scheduling other Compose services or containers.
- Running NewsNow while the Mac is powered off.

## Constraints

- The host is macOS and Docker Desktop must already be running.
- The project currently uses `docker-compose.yml` and exposes NewsNow on port `4444`.
- The schedule follows the Mac's local timezone, including daylight-saving changes.
- Scripts must work regardless of the caller's current directory.
- Repeated start or stop checks must be safe.

## Approaches Considered

### macOS LaunchAgent (selected)

Use one LaunchAgent with calendar triggers at 5:00 AM and 10:00 AM plus `RunAtLoad`. Each trigger runs an idempotent reconciliation script that determines whether the current local time is inside the allowed window and then starts or stops only the `newsnow` service. This is the most reliable native macOS option and handles login or wake-up reconciliation.

### Cron

Use separate start and stop cron entries. This is smaller, but missed events while the Mac sleeps are less predictable on macOS and there is no automatic state reconciliation at login.

### Docker scheduler container

Run a second container that controls NewsNow through the Docker socket. This is portable but adds operational complexity and grants the scheduler broad Docker control.

## Selected Design

### Reconciliation script

Add `scripts/newsnow-schedule.sh`. It will:

1. Resolve the repository directory from the script's own location.
2. Read the current local hour using the host clock.
3. Run `docker compose up -d newsnow` when the hour is 5 through 9.
4. Run `docker compose stop newsnow` at all other hours.
5. Use absolute executable paths supplied by the installer so LaunchAgent's restricted `PATH` does not prevent Docker from being found.
6. Emit timestamped messages and return non-zero on operational failure.

The script will also accept an injectable hour for automated boundary tests without changing the system clock.

### LaunchAgent installer

Add `scripts/install-newsnow-schedule.sh`. It will:

1. Detect the repository's absolute path and the installed Docker executable.
2. Generate `~/Library/LaunchAgents/com.newsnow.schedule.plist` with those absolute paths.
3. Configure `StartCalendarInterval` triggers for 5:00 AM and 10:00 AM.
4. Set `RunAtLoad` so the correct container state is restored after login or agent reload.
5. Configure stdout and stderr log files under `~/Library/Logs/NewsNow/`.
6. Load or replace the per-user LaunchAgent using `launchctl`.
7. Trigger one immediate reconciliation.

### Uninstaller

Add `scripts/uninstall-newsnow-schedule.sh`. It will unload the LaunchAgent and remove only the generated plist. It will leave the application, Docker volume, logs, and container state intact.

### Documentation

Add a README section covering installation, manual reconciliation, status/log inspection, removal, the 5:00-10:00 schedule, and the requirement that Docker Desktop be available.

## Error Handling

- Missing Docker or Compose support produces a clear error during installation.
- A failed Docker command is logged and returned as a failure so `launchd` diagnostics remain useful.
- Installation creates required directories before writing files.
- Reinstallation replaces the existing agent configuration rather than creating duplicates.

## Verification

- Test the reconciliation script with injected hours at the boundaries: 04:59-equivalent hour 4 stops, hour 5 starts, hour 9 starts, and hour 10 stops.
- Use a fake Docker executable in tests to verify exact Compose commands without changing real containers.
- Validate the generated plist with `plutil`.
- Install the LaunchAgent and inspect it with `launchctl print`.
- Run one live reconciliation and confirm the NewsNow service matches the current schedule.
