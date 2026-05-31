# 地图服务使用说明

## ✅ 最终决定：上线使用高德地图

**决策日期**：2026-05-31  
**决策原因**：
- 主要服务中国用户
- 免费额度充足（30万次/天）
- 中国地区数据最准确
- 无需信用卡，注册简单

## 当前状态
- 开发阶段：使用 OpenStreetMap 官方瓦片服务
- ⚠️ 仅适合开发测试，不适合生产环境
- 上线前必须切换到高德地图

## 使用限制（OpenStreetMap）
OpenStreetMap 官方服务器有以下限制：
- 仅供轻量级使用
- 禁止重度商业使用
- 可能会被限流或封禁

---

## 🎯 生产环境方案：高德地图

### 为什么选择高德地图？
1. **免费额度充足**：30万次/天（约900万次/月）
2. **中国地区优势**：
   - 地图数据最准确
   - 中文地址解析最好
   - POI 信息最全
   - 服务器在中国，速度快
3. **成本优势**：
   - 免费额度远超 Mapbox（50,000/月）
   - 适合中小型应用长期使用
4. **技术支持**：
   - 中文文档完善
   - 技术支持响应快

### 集成步骤

#### 1. 注册高德开放平台账号
- 访问：https://lbs.amap.com/
- 注册账号（需要实名认证）
- 创建应用
- 获取 Web 服务 API Key

#### 2. 安装依赖
```bash
npm install @amap/amap-jsapi-loader
```

#### 3. 更新代码

**方案 A：使用高德 JS API（推荐）**
```typescript
// frontend/src/components/MapComponent.tsx
import AMapLoader from '@amap/amap-jsapi-loader';

useEffect(() => {
  AMapLoader.load({
    key: 'YOUR_AMAP_KEY', // 申请好的Web端开发者Key
    version: '2.0',
    plugins: ['AMap.Scale', 'AMap.ToolBar'],
  }).then((AMap) => {
    const map = new AMap.Map(mapContainerRef.current, {
      zoom: 12,
      center: [116.4074, 39.9042],
    });
    
    // 添加标记
    markers.forEach((marker) => {
      new AMap.Marker({
        position: [marker.longitude, marker.latitude],
        title: marker.title,
        map: map,
      });
    });
  });
}, []);
```

**方案 B：使用 Leaflet + 高德瓦片（简单）**
```typescript
// frontend/src/components/MapComponent.tsx
L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
  attribution: '© 高德地图',
  maxZoom: 18,
  subdomains: ['1', '2', '3', '4'],
}).addTo(map);
```

#### 4. 环境变量配置
```env
# .env
VITE_AMAP_KEY=your_amap_key_here
```

```typescript
// 使用环境变量
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY;
```

### 功能对比

| 功能 | OpenStreetMap | 高德地图 | Mapbox |
|------|---------------|----------|--------|
| 免费额度 | 无明确限制（很低） | 30万次/天 | 5万次/月 |
| 中国地图 | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 地址解析 | ❌ | ✅ | ✅ |
| POI 搜索 | ❌ | ✅ | ✅ |
| 路线规划 | ❌ | ✅ | ✅ |
| 中文支持 | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 加载速度（中国） | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 备选方案

### Mapbox（国际用户）
- 免费额度：50,000 次/月
- 价格：$5/1000 次（超出后）
- 适合：国际化应用

### Google Maps
- $200 免费信用额度/月
- 功能最全
- 需要信用卡

### 自建瓦片服务器
- 无限制
- 需要服务器和维护
- 成本：$70-300/月

---

## 当前风险评估

### 开发阶段 ✅
- 当前使用量：低
- 风险：低
- 建议：可以继续使用 OSM

### 测试阶段 ⚠️
- 预期使用量：中
- 风险：中
- 建议：开始准备切换

### 生产环境 ❌
- 预期使用量：高
- 风险：高（可能被封禁）
- **决定：切换到高德地图**

---

## 实施计划

### Phase 1：准备阶段（上线前 2 周）
- [ ] 注册高德开放平台账号
- [ ] 完成实名认证
- [ ] 创建应用，获取 API Key
- [ ] 阅读高德地图 API 文档

### Phase 2：开发阶段（上线前 1 周）
- [ ] 安装 @amap/amap-jsapi-loader
- [ ] 重构 MapComponent 组件
- [ ] 适配标记显示逻辑
- [ ] 测试地图功能
- [ ] 配置环境变量

### Phase 3：测试阶段（上线前 3 天）
- [ ] 功能测试（标记、点击、缩放）
- [ ] 性能测试（加载速度）
- [ ] 兼容性测试（浏览器）
- [ ] 移动端测试

### Phase 4：上线
- [ ] 更新生产环境配置
- [ ] 部署新版本
- [ ] 监控地图加载情况
- [ ] 监控 API 使用量

---

## 成本估算

### 高德地图
- **0-300,000 次/天**：免费 ✅
- **超出后**：需要商务洽谈
- **预计月成本**：$0（免费额度足够）

### 使用量预估
假设日活 1000 人，每人平均加载地图 5 次：
- 日使用量：5,000 次
- 月使用量：150,000 次
- **结论**：完全在免费额度内 ✅

---

## 技术支持

### 高德地图文档
- 官网：https://lbs.amap.com/
- JS API 文档：https://lbs.amap.com/api/javascript-api/summary
- 示例中心：https://lbs.amap.com/demo/list/jsapi-v2

### 常见问题
1. **Q: 需要备案吗？**
   A: Web 应用不需要备案，但需要实名认证

2. **Q: 可以用于商业项目吗？**
   A: 可以，免费额度内可商用

3. **Q: 超出免费额度怎么办？**
   A: 联系高德商务，通常会提供优惠套餐

---

## ✅ 最终决定总结

**开发阶段**：继续使用 OpenStreetMap（当前）  
**生产环境**：切换到高德地图（上线前完成）  
**原因**：免费额度充足 + 中国地区最优  
**时间**：上线前 2 周开始准备

**负责人**：开发团队  
**截止日期**：上线前完成切换  
**优先级**：高（必须完成）
