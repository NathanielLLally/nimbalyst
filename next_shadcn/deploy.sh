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

# Step 2: Copy .env to temporary location and change permissions
echo -e "${YELLOW}Step 2: Preparing .env file...${NC}"
sudo cp "$TOP/.env" /tmp/.env
sudo chown "${REMOTE_USER}:${REMOTE_USER}" /tmp/.env
echo -e "${GREEN}✅ .env prepared${NC}"
echo ""

# Step 3: Copy .env to remote server
echo -e "${YELLOW}Step 3: Copying .env to remote server...${NC}"
scp /tmp/.env "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/"
echo -e "${GREEN}✅ .env copied to remote${NC}"
echo ""

# Step 4: Clean up local temp .env
sudo rm /tmp/.env

# Step 5: Remote deployment
echo -e "${YELLOW}Step 4: Running remote build and deployment...${NC}"
echo "Pulling latest code..."
echo "Building application..."
ssh "${REMOTE_USER}@${REMOTE_HOST}" << 'REMOTE_SCRIPT'
  set -e

  TOP="/home/devel/src/git/nimbalyst/next_shadcn"

  cd "$TOP"
  git pull

  npm run build
REMOTE_SCRIPT
echo "✅ Remote build completed"
echo -e "${GREEN}✅ Remote build successful${NC}"
echo ""

# Step 6: Restart services
echo -e "${YELLOW}Step 5: Restarting services...${NC}"
echo "Restarting happytailspawcare service..."
echo "Checking happytailspawcare status..."
echo ""
echo "Restarting vapi-processor service..."
echo "Checking vapi-processor status..."
ssh "${REMOTE_SUDO_USER}@${REMOTE_HOST}" << 'RESTART_SCRIPT'
  sudo systemctl restart happytailspawcare
  sudo systemctl status happytailspawcare --no-pager

  sudo systemctl restart vapi-processor
  sudo systemctl status vapi-processor --no-pager
RESTART_SCRIPT
echo "✅ Services restarted successfully"
echo -e "${GREEN}✅ Services restarted${NC}"
echo ""

echo -e "${GREEN}=== Deploy Complete ===${NC}"
echo "Application is now live on $REMOTE_HOST"
