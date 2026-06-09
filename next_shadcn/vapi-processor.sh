#!/bin/bash

##
# Vapi Contact Tracker Processor
# Continuously polls and retries contacts every 30 seconds
# Usage: ./vapi-processor.sh &
# Or: nohup ./vapi-processor.sh > /var/log/vapi-processor.log 2>&1 &
##

BASE_URL="${BASE_URL:-https://happytailspawcare.com}"
POLL_INTERVAL="${POLL_INTERVAL_SECONDS:-60}"
LOG_FILE="${LOG_FILE:-/var/log/vapi-processor.log}"

echo "🚀 Starting Vapi Contact Processor"
echo "   URL: $BASE_URL/api/vapi-process"
echo "   Interval: ${POLL_INTERVAL}s"
echo "   Log: $LOG_FILE"

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

  # Call the process endpoint
  RESPONSE=$(curl -s -X POST "$BASE_URL/api/vapi-process" \
    -H "Content-Type: application/json" \
    -w "\n%{http_code}" 2>&1)

  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)

  if [ "$HTTP_CODE" = "200" ]; then
    echo "[$TIMESTAMP] ✅ Process completed (HTTP $HTTP_CODE)" >> "$LOG_FILE"
  else
    echo "[$TIMESTAMP] ⚠️  Process failed (HTTP $HTTP_CODE): $BODY" >> "$LOG_FILE"
  fi

  # Wait before next poll
  sleep "$POLL_INTERVAL"
done
