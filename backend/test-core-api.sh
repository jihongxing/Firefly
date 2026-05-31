#!/bin/bash

echo "🧪 Testing Firefly Core API Endpoints"
echo "======================================"
echo ""

BASE_URL="http://localhost:3000/api"

# Test 1: Health Check
echo "1️⃣  Testing Health Check..."
curl -s "$BASE_URL/health" | head -5
echo -e "\n"

# Test 2: Get Config
echo "2️⃣  Testing GET /api/config..."
curl -s "$BASE_URL/config" | head -10
echo -e "\n"

# Test 3: Get Markers (with geo query)
echo "3️⃣  Testing GET /api/markers..."
curl -s "$BASE_URL/markers?lat=39.9042&lng=116.4074&radius=5000&limit=10" | head -20
echo -e "\n"

# Test 4: Get Marker by ID
echo "4️⃣  Testing GET /api/markers/1..."
curl -s "$BASE_URL/markers/1" | head -15
echo -e "\n"

# Test 5: Get Feedback Summary
echo "5️⃣  Testing GET /api/markers/1/feedback-summary..."
curl -s "$BASE_URL/markers/1/feedback-summary"
echo -e "\n"

# Test 6: Submit Marker
echo "6️⃣  Testing POST /api/markers/submit..."
curl -s -X POST "$BASE_URL/markers/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "abuse",
    "title": "Test marker submission",
    "latitude": 39.91,
    "longitude": 116.41,
    "address": "Test address",
    "description": "Test description",
    "sourceLocale": "en"
  }'
echo -e "\n"

# Test 7: Submit Feedback
echo "7️⃣  Testing POST /api/markers/1/feedback..."
curl -s -X POST "$BASE_URL/markers/1/feedback" \
  -H "Content-Type: application/json" \
  -d '{
    "feedbackType": "confirm",
    "comment": "Test feedback",
    "confidenceLevel": 4
  }'
echo -e "\n"

echo ""
echo "======================================"
echo "✨ API tests completed!"
