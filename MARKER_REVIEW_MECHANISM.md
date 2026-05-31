# 标记审核机制说明

## 问题
新提交的标记不会立即显示在地图上。

## 原因
系统有审核机制：
- 新标记的 `review_status` 默认为 `pending`
- 地图 API 只返回 `review_status = 'approved'` 的标记
- 这是为了防止垃圾信息和恶意标记

## 当前行为
1. 用户提交标记 → `review_status = 'pending'`
2. 地图查询过滤掉 pending 标记
3. 标记不显示在地图上
4. 需要管理员审核后才显示

## 解决方案

### 选项 A：自动批准（开发/测试环境）⭐
**适用**：开发和测试阶段

**实施**：
```typescript
// backend/src/controllers/markerController.ts
// 提交标记时自动设为 approved
reviewStatus: 'approved', // 改为自动批准
```

**优点**：
- 立即看到效果
- 方便测试
- 无需手动审核

**缺点**：
- 无内容审核
- 可能有垃圾信息

### 选项 B：保持审核机制（生产环境推荐）
**适用**：生产环境

**流程**：
1. 用户提交 → pending
2. 管理员审核 → approved/rejected
3. 批准后显示在地图

**优点**：
- 内容质量保证
- 防止恶意标记
- 符合社区治理理念

**缺点**：
- 需要人工审核
- 延迟显示

### 选项 C：基于用户等级自动批准（推荐）⭐⭐
**适用**：生产环境

**规则**：
- 🌱 新芽守护者（0-10分）：需要审核
- 🔥 萤火守护者（11-50分）：自动批准
- ⭐ 星光守护者（51+分）：自动批准
- 👑 守护天使（201+分）：自动批准

**实施**：
```typescript
const userPoints = user.reputationScore;
const reviewStatus = userPoints >= 11 ? 'approved' : 'pending';
```

**优点**：
- 平衡质量和效率
- 激励用户提升等级
- 减少审核负担
- 信任资深用户

**缺点**：
- 需要实现等级检查

## 个人中心显示问题

**原因**：
- 个人中心的"我的标记"功能暂时禁用
- 因为 Marker 模型缺少 `submittedBy` 字段

**临时解决**：
```sql
-- 添加 submittedBy 字段
ALTER TABLE markers ADD COLUMN submitted_by INT REFERENCES users(id);

-- 更新现有标记（如果知道提交者）
UPDATE markers SET submitted_by = 4 WHERE id = 6;
```

## 推荐方案

### 开发环境
使用 **选项 A**：自动批准所有标记
- 方便测试
- 快速迭代

### 生产环境
使用 **选项 C**：基于等级自动批准
- 新用户需要审核（防止滥用）
- 资深用户自动批准（提升效率）
- 平衡质量和用户体验

---

**要现在实施哪个方案？**
