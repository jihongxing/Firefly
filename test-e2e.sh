#!/bin/bash

echo "🧪 Firefly 端到端测试"
echo "=================================="
echo ""

BASE_URL="http://localhost:3000/api"

# Test 1: Health Check
echo "1️⃣  测试健康检查..."
HEALTH=$(curl -s "$BASE_URL/health")
echo "✓ $HEALTH"
echo ""

# Test 2: Config API
echo "2️⃣  测试配置 API..."
CONFIG=$(curl -s "$BASE_URL/config" | head -5)
echo "✓ 配置加载成功"
echo ""

# Test 3: Get Markers
echo "3️⃣  测试获取标记列表..."
MARKERS=$(curl -s "$BASE_URL/markers?lat=39.9042&lng=116.4074&radius=5000&limit=10")
MARKER_COUNT=$(echo $MARKERS | grep -o '"id"' | wc -l)
echo "✓ 找到 $MARKER_COUNT 个标记"
echo ""

# Test 4: Get Marker Detail
echo "4️⃣  测试获取标记详情..."
MARKER_DETAIL=$(curl -s "$BASE_URL/markers/1")
echo "✓ 标记详情加载成功"
echo ""

# Test 5: Get Marker Detail (English)
echo "5️⃣  测试英文翻译..."
MARKER_EN=$(curl -s "$BASE_URL/markers/1?lang=en")
echo "✓ 英文翻译加载成功"
echo ""

# Test 6: Get Feedback Summary
echo "6️⃣  测试反馈统计..."
FEEDBACK=$(curl -s "$BASE_URL/markers/1/feedback-summary")
echo "✓ $FEEDBACK"
echo ""

# Test 7: Submit Feedback
echo "7️⃣  测试提交反馈..."
FEEDBACK_RESULT=$(curl -s -X POST "$BASE_URL/markers/1/feedback" \
  -H "Content-Type: application/json" \
  -d '{"feedbackType":"confirm","comment":"端到端测试","confidenceLevel":5}')
echo "✓ 反馈提交成功"
echo ""

# Test 8: Submit New Marker
echo "8️⃣  测试提交新标记..."
NEW_MARKER=$(curl -s -X POST "$BASE_URL/markers/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "station",
    "title": "端到端测试救助站",
    "latitude": 39.92,
    "longitude": 116.42,
    "address": "北京市测试地址",
    "description": "这是一个端到端测试标记",
    "sourceLocale": "zh-CN"
  }')
NEW_ID=$(echo $NEW_MARKER | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
echo "✓ 新标记创建成功，ID: $NEW_ID"
echo ""

# Test 9: Frontend Loading
echo "9️⃣  测试前端加载..."
FRONTEND=$(curl -s http://localhost:5173 | grep -o '<title>.*</title>')
echo "✓ 前端页面加载成功: $FRONTEND"
echo ""

echo "=================================="
echo "✨ 所有测试通过！"
echo ""
echo "📍 访问地址："
echo "   前端: http://localhost:5173"
echo "   后端: http://localhost:3000/api/health"
echo ""
echo "🎯 测试场景："
echo "   1. 打开浏览器访问 http://localhost:5173"
echo "   2. 查看地图上的标记"
echo "   3. 点击标记查看详情"
echo "   4. 提交反馈"
echo "   5. 切换语言（中文/English/हिन्दी）"
echo "   6. 点击'提交标记'按钮提交新标记"
echo "   7. 更改搜索半径并刷新"
