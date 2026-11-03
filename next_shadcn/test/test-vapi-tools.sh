#!/bin/sh -x
set -a; . ./.env; set +a   # loads VAPI_WEBHOOK_SECRET

curl -s -w '\nHTTP %{http_code}\n' https://try.happytailspawcare.com/api/vapi-tools \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $VAPI_WEBHOOK_SECRET" \
  -d '{
    "message": {
      "type": "tool-calls",
      "call": { "id": "call_test_123" },
      "toolCallList": [
        { "id": "toolcall_abc123", "name": "check_availability",
          "parameters": { "timezone": "America/New_York" } }
      ],
      "toolWithToolCallList": [
        { "name": "check_availability",
          "toolCall": { "id": "toolcall_abc123",
                        "parameters": { "timezone": "America/New_York" } } }
      ]
    }
  }'
