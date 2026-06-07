# Vapi Contact Processor Setup

The `vapi-processor.sh` script continuously polls and retries contacts every 30 seconds.

## Option 1: Manual Start (Testing)

```bash
cd /path/to/next_shadcn
chmod +x vapi-processor.sh
./vapi-processor.sh &
```

Check logs:
```bash
tail -f /var/log/vapi-processor.log
```

## Option 2: Cron Job (Restart on reboot)

Add to crontab:
```bash
crontab -e
```

Add this line:
```
@reboot /path/to/next_shadcn/vapi-processor.sh >> /var/log/vapi-processor.log 2>&1 &
```

Then start it now:
```bash
nohup /path/to/next_shadcn/vapi-processor.sh >> /var/log/vapi-processor.log 2>&1 &
```

## Option 3: Systemd Service (Recommended)

Create `/etc/systemd/system/vapi-processor.service`:

```ini
[Unit]
Description=Vapi Contact Processor
After=network.target

[Service]
Type=simple
User=devel
WorkingDirectory=/home/devel/www
ExecStart=/home/devel/www/vapi-processor.sh
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable vapi-processor
sudo systemctl start vapi-processor
sudo systemctl status vapi-processor
```

Watch logs:
```bash
sudo journalctl -u vapi-processor -f
```

## Configuration

Set environment variables before running:

```bash
export BASE_URL=https://happytailspawcare.com
export POLL_INTERVAL_SECONDS=30
export LOG_FILE=/var/log/vapi-processor.log
./vapi-processor.sh &
```

## Verify It's Running

```bash
# Check process
ps aux | grep vapi-processor

# Check logs
tail -50 /var/log/vapi-processor.log
```

You should see:
```
[2026-06-07 13:30:00] ✅ Process completed (HTTP 200)
[2026-06-07 13:30:30] ✅ Process completed (HTTP 200)
[2026-06-07 13:31:00] ✅ Process completed (HTTP 200)
```
