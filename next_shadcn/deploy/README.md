# Site Watchdog Setup

Run this on a **different machine** from your web server — a small VPS, a Pi
at another location, or any box with a stable connection. If it runs on the
same server, it's useless when that server itself hangs.

## 1. Create a dedicated restricted SSH key on the watchdog machine

```bash
sudo useradd -r -m -s /bin/bash watchdog
sudo -u watchdog ssh-keygen -t ed25519 -f /home/watchdog/.ssh/id_ed25519 -N ""
```

Copy the **public** key to the web server, appended to the `watchdog`
user's `~/.ssh/authorized_keys` on that end (you said you've already
created this account on the web server — good, this keeps the restart
privilege isolated from your normal `groot` login):

```bash
ssh-copy-id -i /home/watchdog/.ssh/id_ed25519.pub watchdog@mail.htpc.com
```

## 2. Restrict what that key can do (important — least privilege)

On the **web server**, edit the `watchdog` user's authorized_keys entry to
force a specific command, so a stolen key can only restart the app and
nothing else — even if someone gets the private key, this SSH session can
never do anything but run this one command:

```
command="pm2 restart nextjs-app-3000 nextjs-app-3001",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAA... watchdog@monitor
```

That line replaces whatever's currently in
`/home/watchdog/.ssh/authorized_keys` on the web server.

If you use systemd instead of pm2, the `watchdog` user needs sudo rights
for *only* the restart command:

```bash
# /etc/sudoers.d/watchdog-restart   (on the WEB SERVER)
watchdog ALL=(root) NOPASSWD: /usr/bin/systemctl restart nextjs@3000, /usr/bin/systemctl restart nextjs@3001
```

Note: if you use the forced-command `authorized_keys` approach above, you
generally don't need both — pick one. The forced-command approach is
slightly stronger since it constrains the SSH session itself, not just
sudo usage within it.

## 3. Install the script

```bash
sudo cp site-watchdog.sh /usr/local/bin/site-watchdog.sh
sudo chmod +x /usr/local/bin/site-watchdog.sh
sudo mkdir -p /var/log
sudo touch /var/log/site-watchdog.log
sudo chown watchdog:watchdog /var/log/site-watchdog.log /var/tmp/site-watchdog.state 2>/dev/null || true
```

Edit the CONFIG section at the top of `/usr/local/bin/site-watchdog.sh`:
- `URL` — your real URL
- `SSH_HOST` / `SSH_KEY` — matches what you set up in step 1
- `RESTART_CMD` — uncomment/edit whichever matches your process manager
- `WEBHOOK_URL` — optional Slack/Discord incoming webhook for alerts

## 4. Install as a systemd timer (runs every 60s)

```bash
sudo cp site-watchdog.service /etc/systemd/system/
sudo cp site-watchdog.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now site-watchdog.timer
```

Check it's running:

```bash
systemctl list-timers | grep site-watchdog
sudo systemctl start site-watchdog.service   # manual test run
tail -f /var/log/site-watchdog.log
```

## Behavior

- Checks the URL every 60 seconds.
- Requires **3 consecutive failures** (default) before restarting —
  avoids restarting on a single blip / transient network hiccup.
- After a restart, waits a **5-minute cooldown** before restarting again,
  even if failures continue — prevents a restart-loop if the underlying
  cause (e.g. a bad deploy) isn't fixed by restarting.
- Logs everything to `/var/log/site-watchdog.log`.
- Optional webhook alerts on failure/recovery/restart.

## Tuning

- `FAIL_THRESHOLD` — raise if your network to the server is flaky and you
  get false positives; lower for faster response.
- `EXPECT_TEXT` — set to something that only appears when the page fully
  rendered (e.g. a footer string), to catch cases where nginx returns a
  200 but Next.js served a blank/error shell.
- `COOLDOWN_SECONDS` — lower if restarts are cheap and fast; raise if
  restarts are disruptive (dropped websocket connections, etc.).

## Alternative to cron/systemd: crontab

If you'd rather use cron instead of a systemd timer:

```bash
* * * * * /usr/local/bin/site-watchdog.sh >/dev/null 2>&1
```
