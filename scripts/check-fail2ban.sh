#!/bin/bash
# Check all fail2ban jails for an IP address
#
# Usage:
#   ./scripts/check-fail2ban.sh [ip-address]
#   ./scripts/check-fail2ban.sh              # Uses your public IP
#
# On remote server via SSH:
#   ssh user@host "bash -s" < scripts/check-fail2ban.sh 203.0.113.45

IP="${1:-$(curl -s ifconfig.me)}"

if [ -z "$IP" ]; then
  echo "Usage: $0 [ip-address]"
  echo "If no IP provided, uses your current public IP"
  exit 1
fi

echo "Checking all fail2ban jails for IP: $IP"
echo "=========================================="

# Get all jails
jails=$(sudo fail2ban-client status | grep "Jail list:" | sed 's/.*Jail list://' | tr ',' '\n' | xargs)

found_in_any=0

for jail in $jails; do
  status=$(sudo fail2ban-client status "$jail" 2>/dev/null | grep "Banned IP list:" | sed 's/.*Banned IP list://')

  if echo "$status" | grep -q "$IP"; then
    echo "✗ FOUND in jail: $jail"
    echo "  Current bans: $status"
    found_in_any=1
  fi
done

if [ $found_in_any -eq 0 ]; then
  echo "✓ IP not found in any active bans"
fi

echo
echo "Firewall rules for this IP:"
sudo firewall-cmd --list-rich-rules 2>/dev/null | grep "$IP" || echo "(none found in firewall-cmd)"
