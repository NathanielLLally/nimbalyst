#!/bin/bash

# Vapi Contact Tracker Deploy Script
# Deploys code from dev to production server

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TOP="/home/${USER}/src/git/nimbalyst/next_shadcn"
REMOTE_HOST="happytailspawcare.com"
REMOTE_USER="devel"
REMOTE_SUDO_USER="nathaniel"
REMOTE_PATH="/home/devel/src/git/nimbalyst/next_shadcn"

# If running on the deploy host itself, skip SSH and use local commands
CURRENT_HOST="$(hostname)"
if [ -n "$DEPLOY_HOST" ] && [ "$CURRENT_HOST" = "$DEPLOY_HOST" ]; then
  IS_DEPLOY_HOST=true
  echo -e "${YELLOW}Running on deploy host ($CURRENT_HOST) — skipping SSH${NC}"
else
  IS_DEPLOY_HOST=false
  echo -e "${YELLOW}Running on host ($CURRENT_HOST) — deploy with SSH to ${DEPLOY_HOST} ${NC}"
fi

echo -e "${YELLOW}=== Starting Deploy ===${NC}"
echo "Target: $REMOTE_HOST"
echo "Path: $REMOTE_PATH"
echo ""

# Step 1: Commit and push local changes
echo -e "${YELLOW}Step 1: Committing and pushing local changes...${NC}"
cd "$TOP" || exit 1
git add -A
git commit -m "$(date "+%Y-%m-%d %H:%M")" || echo "No changes to commit"
git push
echo -e "${GREEN}✅ Local changes pushed${NC}"
echo ""

# Step 3: Copy .env to remote server
echo -e "${YELLOW}Step 3: Copying .env to remote server...${NC}"
if [ "$IS_DEPLOY_HOST" = true ]; then
  sudo rsync -a --chown="${REMOTE_USER}:${REMOTE_USER}" "$TOP/.env" "$REMOTE_PATH/"
else
  scp -P 2222 "$TOP/.env" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/"
fi
echo -e "${GREEN}✅ .env copied${NC}"
echo ""

# Step 5: Remote deployment
echo -e "${YELLOW}Step 4: Running build and deployment...${NC}"
echo "Pulling latest code..."
echo "Building application..."
if [ "$IS_DEPLOY_HOST" = footrue ]; then
  sudo -u "$REMOTE_USER" SSH_AUTH_SOCK=$SSH_AUTH_SOCK bash -c "
    set -e
    cd '$REMOTE_PATH'
    git pull
    npm install
    npm run build
    npm run build:worker
  "
else
  ssh -p 2222 "${REMOTE_USER}@${REMOTE_HOST}" << 'REMOTE_SCRIPT'
  set -e

  TOP="/home/devel/src/git/nimbalyst/next_shadcn"

  cd "$TOP"
  git pull

  # Install dependencies before building: a pull that adds a package (e.g. a new
  # @types/* devDependency) otherwise fails the build with a missing-module or
  # missing-declaration type error, since node_modules is stale.
  npm install

  npm run build
  # Compile the standalone contact-processor worker (dist/worker/...).
  npm run build:worker
REMOTE_SCRIPT
fi
echo "✅ Remote build completed"
echo -e "${GREEN}✅ Remote build successful${NC}"
echo ""

# Step 6: Restart services
echo -e "${YELLOW}Step 5: Restarting services...${NC}"
echo "Restarting happytailspawcare service and syncing contact-processor units..."
if [ "$IS_DEPLOY_HOST" = true ]; then
  TOP="$REMOTE_PATH"

  sudo systemctl restart happytailspawcare-dev
  sudo systemctl status happytailspawcare-dev --no-pager

  # Contact processing now runs as its own one-shot timer (htpc-contacts),
  # not inside the web app. Keep the unit files in sync with the repo and make
  # sure the retired vapi-processor poller stays disabled.
  sudo cp "$TOP/deploy/systemd/htpc-contacts.service" /etc/systemd/system/
  sudo cp "$TOP/deploy/systemd/htpc-contacts.timer" /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl disable --now vapi-processor.service 2>/dev/null || true
  sudo systemctl enable --now htpc-contacts.timer
  sudo systemctl status htpc-contacts.timer --no-pager
else
  ssh -p 2222 "${REMOTE_SUDO_USER}@${REMOTE_HOST}" << 'RESTART_SCRIPT'
  TOP="/home/devel/src/git/nimbalyst/next_shadcn"

  sudo systemctl restart happytailspawcare-dev
  sudo systemctl status happytailspawcare-dev --no-pager

  # Contact processing now runs as its own one-shot timer (htpc-contacts),
  # not inside the web app. Keep the unit files in sync with the repo and make
  # sure the retired vapi-processor poller stays disabled.
  sudo cp "$TOP/deploy/systemd/htpc-contacts.service" /etc/systemd/system/
  sudo cp "$TOP/deploy/systemd/htpc-contacts.timer" /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl disable --now vapi-processor.service 2>/dev/null || true
  sudo systemctl enable --now htpc-contacts.timer
  sudo systemctl status htpc-contacts.timer --no-pager
RESTART_SCRIPT
fi
echo "✅ Services restarted successfully"
echo -e "${GREEN}✅ Services restarted${NC}"
echo ""

echo -e "${GREEN}=== Deploy Complete ===${NC}"
echo "Application is now live on $REMOTE_HOST"
