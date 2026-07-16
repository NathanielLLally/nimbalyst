#!/usr/bin/env bash
#
# site-watchdog.sh
# Runs on an EXTERNAL machine (not the web server itself).
# Checks the site over HTTPS; if it fails N consecutive times,
# SSHes into the server and restarts the Next.js service(s).
#
# Install: see README.md in this directory.

set -uo pipefail

### ---- CONFIG (edit these) ----------------------------------------------

URL="https://happytailspawcare.com/"          # page to check
EXPECT_STATUS=200                       # expected HTTP status code
EXPECT_TEXT=""                          # optional: string that must appear in body, e.g. "</html>". Leave "" to skip.
CURL_TIMEOUT=10                         # seconds to wait for a response
CURL_CONNECT_TIMEOUT=5                  # seconds to wait for TCP connect

FAIL_THRESHOLD=3                        # consecutive failures before restarting
STATE_FILE="/var/tmp/site-watchdog.state"
LOG_FILE="/var/log/site-watchdog.log"

SSH_HOST="watchdog@mail.happytailspawcare.com"       # user@host to ssh into (dedicated restart-only account)
SSH_KEY="/home/watchdog/.ssh/id_ed25519"  # dedicated key, restart-only sudo (see README)
SSH_OPTS="-i $SSH_KEY -o ConnectTimeout=10 -o BatchMode=yes -o StrictHostKeyChecking=accept-new"

# Command(s) to run on the remote host to restart the app.
# Use whichever matches your setup — pm2, systemd, or docker.
RESTART_CMD="sudo /usr/bin/systemctl restart happytailspawcare happytailspawcare-dev"
# RESTART_CMD="sudo systemctl restart nextjs@3000 nextjs@3001"
# RESTART_CMD="docker restart nextjs-3000 nextjs-3001"

COOLDOWN_SECONDS=300                    # don't restart again within this window after a restart

### ---- ALERTING: Discord webhook -------------------------------------------
#
# Setup:
#   1. In your Discord server, go to the target channel's settings ->
#      Integrations -> Webhooks -> New Webhook. Name it (e.g. "Watchdog"),
#      pick the channel, and copy the Webhook URL.
#   2. Paste it below.
#   3. (Optional but recommended) Get your Discord user ID so critical
#      alerts can @mention you directly — this notifies you even if you
#      have other servers/channels muted, since a direct mention pings
#      regardless of per-channel notification settings.
#      In Discord: Settings -> Advanced -> enable Developer Mode, then
#      right-click your own name anywhere -> Copy User ID.
#
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/1526775986895589448/h0aRq8Ib4IxUg-np3hQwb_gzbn97Jy7ZgMoMjur4W8a04XiChS8fOhKep3-ROw0yOcrK"              # e.g. https://discord.com/api/webhooks/123.../abcDEF...
DISCORD_MENTION_USER_ID="262052520824668161"          # e.g. "123456789012345678" — leave empty to disable @mentions
DISCORD_MENTION_ON_PRIORITY=1       # @mention for notify() calls at this priority or higher (0=normal,1=high,2=critical)

# Only push a phone notification for things worth waking up for.
# Set to "true" to also get pinged on every single failed check
# (can be noisy since FAIL_THRESHOLD failures happen before a restart).
NOTIFY_ON_EVERY_FAILURE=false

# notify TEXT PRIORITY
#   PRIORITY: 0=normal  1=high  2=critical (adds @mention + repeats the mention)
notify() {
  local msg="$1"
  local priority="${2:-0}"

  echo "$(date '+%Y-%m-%d %H:%M:%S') $msg" >> "$LOG_FILE"

  if [[ -n "$DISCORD_WEBHOOK_URL" ]]; then
    local content="$msg"
    if [[ -n "$DISCORD_MENTION_USER_ID" && "$priority" -ge "$DISCORD_MENTION_ON_PRIORITY" ]]; then
      content="<@${DISCORD_MENTION_USER_ID}> $msg"
    fi
    # Escape double quotes/backslashes for valid JSON
    content=$(printf '%s' "$content" | sed 's/\\/\\\\/g; s/"/\\"/g')
    curl -s -m 5 -X POST -H "Content-Type: application/json" \
      -d "{\"username\":\"Site Watchdog\",\"content\":\"$content\"}" \
      "$DISCORD_WEBHOOK_URL" >/dev/null 2>&1 || true
  fi
}

### ---- CHECK ---------------------------------------------------------------

check_site() {
  local body status
  body=$(curl -s -o /tmp/site-watchdog-body.$$ -w '%{http_code}' \
    --max-time "$CURL_TIMEOUT" \
    --connect-timeout "$CURL_CONNECT_TIMEOUT" \
    "$URL" 2>/dev/null)
  status="$body"

  if [[ "$status" != "$EXPECT_STATUS" ]]; then
    rm -f /tmp/site-watchdog-body.$$
    echo "bad_status:$status"
    return 1
  fi

  if [[ -n "$EXPECT_TEXT" ]]; then
    if ! grep -q "$EXPECT_TEXT" /tmp/site-watchdog-body.$$ 2>/dev/null; then
      rm -f /tmp/site-watchdog-body.$$
      echo "missing_text"
      return 1
    fi
  fi

  rm -f /tmp/site-watchdog-body.$$
  echo "ok"
  return 0
}

### ---- STATE -----------------------------------------------------------

read_state() {
  if [[ -f "$STATE_FILE" ]]; then
    cat "$STATE_FILE"
  else
    echo "0 0"   # fail_count last_restart_epoch
  fi
}

write_state() {
  echo "$1 $2" > "$STATE_FILE"
}

### ---- MAIN --------------------------------------------------------------

main() {
  local result fail_count last_restart now

  result=$(check_site)
  read -r fail_count last_restart <<< "$(read_state)"
  now=$(date +%s)

  if [[ "$result" == "ok" ]]; then
    if [[ "$fail_count" -gt 0 ]]; then
      notify "✅ Site recovered ($URL) after $fail_count failed check(s)." "0"
    fi
    write_state 0 "$last_restart"
    exit 0
  fi

  fail_count=$((fail_count + 1))
  if [[ "$NOTIFY_ON_EVERY_FAILURE" == "true" ]]; then
    notify "⚠️ Check failed ($result) — $URL — consecutive failures: $fail_count/$FAIL_THRESHOLD" "-1"
  fi
  write_state "$fail_count" "$last_restart"

  if [[ "$fail_count" -lt "$FAIL_THRESHOLD" ]]; then
    exit 1
  fi

  # Threshold hit — consider restarting, but respect cooldown so we don't
  # restart-loop a server that's failing for a reason a restart won't fix.
  if (( now - last_restart < COOLDOWN_SECONDS )); then
    notify "⏳ Threshold hit but within cooldown window (last restart $((now-last_restart))s ago). Skipping restart." "1"
    exit 1
  fi

  notify "🔁 Site down ($result), $fail_count consecutive failures. Restarting now via SSH." "1"

  if ssh $SSH_OPTS "$SSH_HOST" "$RESTART_CMD" >> "$LOG_FILE" 2>&1; then
    notify "✅ Restart command completed for $URL." "0"
  else
    notify "❌ SSH restart FAILED for $URL. Manual intervention needed now." "2"
  fi

  write_state 0 "$now"
  exit 1
}

main
