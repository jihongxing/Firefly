# 举报合并方案设计

## 问题
当前系统中，同一个标记（marker_id=1）有 3 条独立的举报：
- 举报1：false_info（信息不实）
- 举报2：wrong_location（位置错误）
- 举报3：wrong_location（位置错误）

这导致：
- 投票力量分散
- 用户可能对同一标记投多次票
- 难以达成共识
- 用户体验混乱

## 解决方案：举报合并

### 核心逻辑
**同一标记在投票期内只能有一个活跃举报**

### 实施规则

1. **提交举报时检查**
   - 检查该标记是否已有 `vote_status = 'voting'` 的举报
   - 如果存在，将新举报原因添加到现有举报
   - 如果不存在，创建新举报

2. **多原因支持**
   - 举报可以有多个原因（数组）
   - 显示所有举报原因和举报人数
   - 例如：`["false_info", "wrong_location"]`

3. **举报人追踪**
   - 记录所有举报人
   - 防止同一人重复举报同一标记
   - 显示举报人数

### 数据库设计

```sql
-- 方案1：使用 JSON 数组存储多个原因
ALTER TABLE reports ADD COLUMN reasons JSONB DEFAULT '[]';
ALTER TABLE reports ADD COLUMN reporter_ids INT[] DEFAULT '{}';

-- 方案2：创建关联表（更规范）
CREATE TABLE report_reasons (
  id SERIAL PRIMARY KEY,
  report_id INT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id),
  reason VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(report_id, user_id)
);
```

### API 逻辑更新

```typescript
// POST /api/gamification/:id/report
async submitReport(markerId, userId, reason, description) {
  // 1. 检查是否已有活跃举报
  const existingReport = await prisma.report.findFirst({
    where: {
      markerId,
      voteStatus: 'voting',
      voteDeadline: { gt: new Date() }
    }
  });

  if (existingReport) {
    // 2. 检查该用户是否已举报过
    const alreadyReported = await prisma.reportReason.findFirst({
      where: {
        reportId: existingReport.id,
        userId
      }
    });

    if (alreadyReported) {
      throw new Error('你已经举报过这个标记了');
    }

    // 3. 添加新的举报原因
    await prisma.reportReason.create({
      data: {
        reportId: existingReport.id,
        userId,
        reason,
        description
      }
    });

    return { merged: true, reportId: existingReport.id };
  } else {
    // 4. 创建新举报
    const newReport = await prisma.report.create({
      data: {
        markerId,
        userId,
        reportType: 'marker',
        reason,
        status: 'pending',
        voteStatus: 'voting',
        voteDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        ipAddress: req.ip
      }
    });

    await prisma.reportReason.create({
      data: {
        reportId: newReport.id,
        userId,
        reason,
        description
      }
    });

    return { merged: false, reportId: newReport.id };
  }
}
```

### 前端显示

```tsx
<div className="bg-orange-50 rounded-xl p-4 mb-4">
  <div className="font-semibold text-orange-600 mb-2">
    举报原因（{reportReasons.length}人举报）:
  </div>
  <div className="flex flex-wrap gap-2">
    {reportReasons.map((r, i) => (
      <span key={i} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
        {r.reason === 'false_info' ? '信息不实' :
         r.reason === 'wrong_location' ? '位置错误' :
         r.reason === 'malicious' ? '恶意标记' : '其他'}
        {r.count > 1 && ` (${r.count})`}
      </span>
    ))}
  </div>
</div>
```

## 优势

### 对用户
- ✅ 不会看到重复的举报
- ✅ 投票更集中，更快达成共识
- ✅ 可以看到所有举报原因
- ✅ 防止重复举报

### 对系统
- ✅ 投票力量集中
- ✅ 更快的决策
- ✅ 更清晰的数据
- ✅ 更好的用户体验

### 对社区
- ✅ 更高效的治理
- ✅ 避免投票分散
- ✅ 更快的响应速度

## 实施计划

### Phase 1: 数据库迁移（15分钟）
- 创建 report_reasons 表
- 迁移现有数据

### Phase 2: 后端逻辑（30分钟）
- 更新举报提交逻辑
- 添加重复检测
- 更新查询逻辑

### Phase 3: 前端显示（30分钟）
- 更新举报卡片显示
- 显示多个原因
- 显示举报人数

### Phase 4: 测试（15分钟）
- 测试合并逻辑
- 测试重复举报防护
- 测试显示效果

**总时间**: 约 1.5 小时

---

## 推荐：立即实施

这个改进将显著提升系统的可用性和效率。

**要现在实施吗？**
