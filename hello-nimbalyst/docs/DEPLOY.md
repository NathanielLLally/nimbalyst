# Deploy Script Guide

Automated deployment script for Happy Tails Paw Care website.

## Overview

The `deploy.sh` script handles the complete deployment pipeline:

1. **Local:** Commit and push code changes
2. **Local:** Prepare `.env` file with correct permissions
3. **Transfer:** Copy `.env` to remote server
4. **Remote:** Pull latest code and build
5. **Remote:** Restart systemd service

## Prerequisites

Before running the deploy script, ensure:

- ✅ SSH key-based auth configured to `happytailspawcare.com`
- ✅ `devel` user exists on remote server
- ✅ Git repository initialized on both machines
- ✅ `.env` file exists locally with all required variables
- ✅ `happytailspawcare` systemd service configured on remote
- ✅ Node.js and npm installed on remote

## Usage

### Basic Deployment

```bash
./deploy.sh
```

This will:
1. Ask for sudo password (for `.env` file handling)
2. Commit any uncommitted changes with timestamp
3. Push to origin
4. Transfer `.env` to remote
5. Build application on remote
6. Restart service
7. Display service status

### What Gets Deployed

- All committed code changes
- Updated `.env` file with environment variables
- Rebuilt Next.js application
- Restarted Node.js service

### What Does NOT Get Deployed

- Uncommitted local changes (you must commit first)
- Files in `.gitignore`
- Database migrations (manual step if needed)
- SSL certificates (pre-configured)

## Script Flow

```
Local Machine
├─ cd $TOP
├─ git add -A && git commit && git push
├─ sudo cp .env /tmp/.env
├─ sudo chown devel:devel /tmp/.env
└─ scp .env to remote
        ↓
Remote Machine
├─ git pull
├─ npm run build
├─ sudo systemctl restart happytailspawcare
└─ sudo systemctl status happytailspawcare
```

## Configuration

Edit these variables at the top of `deploy.sh` if needed:

```bash
TOP="/home/${USER}/src/git/nimbalyst/next_shadcn"
REMOTE_HOST="happytailspawcare.com"
REMOTE_USER="devel"
REMOTE_PATH="/home/devel/src/git/nimbalyst/next_shadcn"
```

## Troubleshooting

### "Permission denied" on .env copy

**Issue:** `sudo cp` fails
```
sudo: no tty present and no askpass program specified
```

**Solution:** Run with `-S` flag to read password from stdin:
```bash
sudo -S ./deploy.sh <<< "your_password"
```

Or ensure sudo is configured without password:
```bash
sudo visudo
# Add: deployer ALL=(ALL) NOPASSWD: /usr/bin/cp, /usr/bin/chown
```

### SSH connection fails

**Issue:** `Permission denied (publickey)`

**Solution:** 
1. Check SSH key is configured:
   ```bash
   ssh-keygen -t ed25519
   ssh-copy-id -i ~/.ssh/id_ed25519.pub devel@happytailspawcare.com
   ```

2. Verify SSH connection:
   ```bash
   ssh devel@happytailspawcare.com "echo Connected"
   ```

### Build fails on remote

**Issue:** `npm run build` fails

**Solution:**
1. SSH to remote and debug:
   ```bash
   ssh devel@happytailspawcare.com
   cd /home/devel/src/git/nimbalyst/next_shadcn
   npm install
   npm run build
   ```

2. Check logs:
   ```bash
   npm run build 2>&1 | tee build.log
   ```

### Service won't restart

**Issue:** `systemctl restart happytailspawcare` fails

**Solution:**
1. Check service status:
   ```bash
   ssh devel@happytailspawcare.com "sudo systemctl status happytailspawcare"
   ```

2. View service logs:
   ```bash
   ssh devel@happytailspawcare.com "sudo journalctl -u happytailspawcare -n 50"
   ```

3. Restart manually if needed:
   ```bash
   ssh devel@happytailspawcare.com "sudo systemctl restart happytailspawcare"
   ```

## Environment Variables

The script transfers `.env` which should contain:

```env
# Google Sheets
GOOGLE_SHEET_ID=...
GOOGLE_API_KEY=...

# Vapi
VAPI_API_KEY=...
VAPI_PHONE_NUMBER_ID=...
VAPI_ASSISTANT_ID=...

# Webhook
VAPI_WEBHOOK_SECRET=...

# Database (if needed)
DATABASE_URL=...
```

**Important:** Never commit `.env` to git. The script copies it directly to avoid committing secrets.

## Monitoring After Deploy

### Check service status
```bash
ssh devel@happytailspawcare.com "sudo systemctl status happytailspawcare"
```

### View logs
```bash
ssh devel@happytailspawcare.com "sudo journalctl -u happytailspawcare -f"
```

### Check API endpoints
```bash
curl https://happytailspawcare.com/api/vapi-webhook
# Should return: { "status": "ok", ... }
```

### Monitor form submissions
```bash
ssh devel@happytailspawcare.com "curl https://localhost:3000/api/vapi-track"
```

## Safety Measures

The script includes:

- ✅ `set -e` — exits on any error
- ✅ Error messages in red — clear failure indication
- ✅ Success messages in green — progress tracking
- ✅ Step-by-step output — debugging visibility
- ✅ No force flags — safe git operations

## Rollback

If deployment fails:

```bash
# SSH to remote
ssh devel@happytailspawcare.com

# Go to repo
cd /home/devel/src/git/nimbalyst/next_shadcn

# Revert last commit
git revert HEAD --no-edit

# Rebuild and restart
npm run build
sudo systemctl restart happytailspawcare
```

Or revert to previous git tag:

```bash
git checkout v1.0.0
npm run build
sudo systemctl restart happytailspawcare
```

## Scheduling Deployments

To automatically deploy on a schedule (e.g., daily at 2 AM):

```bash
# Add to crontab
crontab -e

# Add line:
0 2 * * * /home/nathaniel/src/git/nimbalyst/hello-nimbalyst/deploy.sh >> /var/log/deploy.log 2>&1
```

## Dry Run

To test the script without making changes:

```bash
# Comment out these lines in deploy.sh:
# git commit, git push, scp, ssh commands

# Or test SSH connectivity only:
ssh devel@happytailspawcare.com "cd /home/devel/src/git/nimbalyst/next_shadcn && pwd"
```

## Getting Help

For issues, check:
1. Service logs: `sudo journalctl -u happytailspawcare -n 100`
2. Build logs: `npm run build 2>&1 | tee build.log`
3. Git status: `git status && git log --oneline -5`
4. Network: `ssh devel@happytailspawcare.com "ping 8.8.8.8"`

---

**Last updated:** 2026-06-06
**Service:** Happy Tails Paw Care (happytailspawcare.com)
**Repository:** /home/devel/src/git/nimbalyst/next_shadcn
