# 地图服务使用说明

## 当前状态
- 使用 OpenStreetMap 官方瓦片服务
- ⚠️ 仅适合开发测试，不适合生产环境

## 使用限制
OpenStreetMap 官方服务器有以下限制：
- 仅供轻量级使用
- 禁止重度商业使用
- 可能会被限流或封禁

## 生产环境建议

### 推荐方案：Mapbox（免费额度充足）

**免费额度**：50,000 次地图加载/月

**集成步骤**：
1. 注册 Mapbox 账号：https://www.mapbox.com/
2. 获取 Access Token
3. 更新代码：

```typescript
// frontend/src/components/MapComponent.tsx
L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
  attribution: '© Mapbox © OpenStreetMap',
  maxZoom: 19,
  id: 'mapbox/streets-v11',
  accessToken: 'YOUR_MAPBOX_TOKEN',
}).addTo(map);
```

### 备选方案

**1. 高德地图**（中国用户）
- 免费额度：30万次/天
- 适合中国地区

**2. Google Maps**
- $200 免费信用额度/月
- 功能最全

**3. 自建瓦片服务器**
- 无限制
- 需要服务器和维护

## 当前风险评估

### 开发阶段 ✅
- 当前使用量：低
- 风险：低
- 建议：可以继续使用

### 测试阶段 ⚠️
- 预期使用量：中
- 风险：中
- 建议：考虑切换

### 生产环境 ❌
- 预期使用量：高
- 风险：高（可能被封禁）
- 建议：必须切换到商业服务

## 立即行动

**短期（本周）**：
- 添加 User-Agent 标识
- 监控使用量

**中期（上线前）**：
- 注册 Mapbox 账号
- 集成 Mapbox 地图
- 测试功能

**长期（运营后）**：
- 根据用户量选择合适方案
- 考虑自建服务器（用户量大时）

## 成本估算

### Mapbox
- 0-50,000 次/月：免费
- 50,000-100,000 次/月：~$25
- 100,000-500,000 次/月：~$125

### 高德地图
- 0-300,000 次/天：免费
- 超出：需要商务洽谈

### 自建
- 服务器：$50-200/月
- 存储：$20-100/月
- 维护：时间成本

---

**建议**：在上线前切换到 Mapbox，免费额度对中小型应用足够使用。
