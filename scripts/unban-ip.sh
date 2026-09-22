#!/bin/bash
# Remove an IP from all fail2ban jails and firewall rules
#
# Usage:
#   ./scripts/unban-ip.sh [ip-address]
#   ./scripts/unban-ip.sh                # Uses your public IP
#
# On remote server via SSH:
#   ssh user@host "bash -s" < scripts/unban-ip.sh 203.0.113.45

IP="${1:-$(curl -s ifconfig.me)}"

if [ -z "$IP" ]; then
  echo "Usage: $0 [ip-address]"
  echo "If no IP provided, uses your current public IP"
  exit 1
fi

echo "Unbanning IP: $IP"
echo "================="

# Get all jails
jails=$(sudo fail2ban-client status | grep "Jail list:" | sed 's/.*Jail list://' | tr ',' '\n' | xargs)

unbanned_count=0

for jail in $jails; do
  status=$(sudo fail2ban-client status "$jail" 2>/dev/null | grep "Banned IP list:" | sed 's/.*Banned IP list://')

  if echo "$status" | grep -q "$IP"; then
    echo "Removing from jail: $jail"
    sudo fail2ban-client set "$jail" unbanip "$IP"
    ((unbanned_count++))
  fi
done

if [ $unbanned_count -eq 0 ]; then
  echo "✓ IP not found in any fail2ban jails (already clean)"
else
  echo "✓ Removed from $unbanned_count jail(s)"
fi

# Check firewall rules
echo
echo "Checking firewall rules..."
firewall_rules=$(sudo firewall-cmd --list-rich-rules 2>/dev/null | grep "$IP")

if [ -n "$firewall_rules" ]; then
  echo "Found firewall rules for $IP:"
  echo "$firewall_rules"
  echo
  echo "To remove manually:"
  echo "  sudo firewall-cmd --remove-rich-rule='...' --permanent"
  echo "  sudo firewall-cmd --reload"
else
  echo "✓ No firewall rules found for $IP"
fi
