#!/bin/bash

echo "🧪 Testing Firefly Backend API"
echo "================================"
echo ""

BASE_URL="http://localhost:3000"

echo "1️⃣  Testing Health Check..."
HEALTH=$(curl -s "$BASE_URL/api/health")
echo "Response: $HEALTH"
echo ""

if echo "$HEALTH" | grep -q '"ok":true'; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed"
  exit 1
fi

echo ""
echo "================================"
echo "✨ All tests passed!"
