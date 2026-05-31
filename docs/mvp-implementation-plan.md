# Firefly MVP 实施计划

## 1. MVP 目标

### 1.1 核心价值
打造一个**宠物医疗版大众点评**，让宠物主人能够：
- 快速找到附近的宠物诊所
- 查看真实的用户评价
- 分享自己的就诊体验

### 1.2 MVP 范围
**包含功能**：
- ✅ 地图浏览诊所
- ✅ 诊所详情展示
- ✅ 用户评价系统
- ✅ 基础用户认证

**不包含功能**：
- ❌ 预约系统
- ❌ 在线咨询
- ❌ 诊所认证服务
- ❌ 高级筛选

---

## 2. 技术选型

### 2.1 前端技术栈
```json
{
  "framework": "React 18 + TypeScript",
  "build": "Vite",
  "map": "Mapbox GL JS",
  "ui": "Tailwind CSS + shadcn/ui",
  "state": "React Context + Hooks",
  "routing": "React Router v6",
  "http": "Axios"
}
```

### 2.2 后端技术栈
```json
{
  "runtime": "Node.js 18+",
  "framework": "Express + TypeScript",
  "database": "SQLite (开发) / PostgreSQL (生产)",
  "auth": "JWT + bcrypt",
  "validation": "Zod",
  "orm": "Drizzle ORM"
}
```

### 2.3 部署方案
- **前端**：Vercel
- **后端**：Railway / Render
- **数据库**：Railway PostgreSQL
- **图片存储**：Cloudinary (免费额度)

---

## 3. 数据库设计（简化版）

### 3.1 核心表结构

```sql
-- 诊所表
CREATE TABLE clinics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  phone VARCHAR(50),
  description TEXT,
  images TEXT,                        -- JSON array
  rating_avg DECIMAL(2, 1) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 用户表
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  avatar VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 评价表
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  images TEXT,                        -- JSON array
  visit_date DATE,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 收藏表
CREATE TABLE favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, clinic_id)
);

-- 索引
CREATE INDEX idx_clinics_location ON clinics(latitude, longitude);
CREATE INDEX idx_reviews_clinic ON reviews(clinic_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_favorites_user ON favorites(user_id);
```

---

## 4. API 设计（MVP 版本）

### 4.1 诊所 API

#### `GET /api/clinics`
查询诊所列表（地图范围查询）
```typescript
// Request
GET /api/clinics?bounds=39.9,116.3,40.0,116.4&limit=50

// Response
{
  "data": [
    {
      "id": 1,
      "name": "爱宠动物医院",
      "address": "北京市朝阳区...",
      "latitude": 39.95,
      "longitude": 116.35,
      "rating_avg": 4.5,
      "rating_count": 128
    }
  ],
  "total": 1
}
```

#### `GET /api/clinics/:id`
获取诊所详情
```typescript
// Response
{
  "clinic": {
    "id": 1,
    "name": "爱宠动物医院",
    "address": "北京市朝阳区...",
    "phone": "010-12345678",
    "description": "专业宠物医疗服务...",
    "images": ["url1", "url2"],
    "rating_avg": 4.5,
    "rating_count": 128
  },
  "reviews": [
    {
      "id": 1,
      "user": {
        "id": 1,
        "nickname": "小明",
        "avatar": "url"
      },
      "rating": 5,
      "content": "医生很专业...",
      "images": ["url"],
      "visit_date": "2024-05-20",
      "like_count": 12,
      "created_at": "2024-05-21T10:00:00Z"
    }
  ]
}
```

### 4.2 评价 API

#### `POST /api/reviews`
发布评价（需要登录）
```typescript
// Request
POST /api/reviews
Authorization: Bearer <token>
{
  "clinic_id": 1,
  "rating": 5,
  "content": "医生很专业，环境也很好",
  "images": ["url1", "url2"],
  "visit_date": "2024-05-20"
}

// Response
{
  "id": 1,
  "clinic_id": 1,
  "user_id": 1,
  "rating": 5,
  "content": "...",
  "created_at": "2024-05-21T10:00:00Z"
}
```

#### `POST /api/reviews/:id/like`
点赞评价（需要登录）
```typescript
// Request
POST /api/reviews/1/like
Authorization: Bearer <token>

// Response
{
  "like_count": 13
}
```

### 4.3 用户 API

#### `POST /api/auth/register`
用户注册
```typescript
// Request
{
  "email": "user@example.com",
  "password": "password123",
  "nickname": "小明"
}

// Response
{
  "token": "jwt_token",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "小明"
  }
}
```

#### `POST /api/auth/login`
用户登录
```typescript
// Request
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "token": "jwt_token",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "nickname": "小明"
  }
}
```

#### `GET /api/users/me`
获取当前用户信息（需要登录）
```typescript
// Response
{
  "id": 1,
  "email": "user@example.com",
  "nickname": "小明",
  "avatar": "url",
  "review_count": 5,
  "favorite_count": 3
}
```

#### `POST /api/favorites`
收藏诊所（需要登录）
```typescript
// Request
{
  "clinic_id": 1
}

// Response
{
  "id": 1,
  "clinic_id": 1,
  "created_at": "2024-05-21T10:00:00Z"
}
```

#### `DELETE /api/favorites/:clinic_id`
取消收藏（需要登录）

---

## 5. 前端页面设计

### 5.1 页面结构
```
/                          # 地图浏览页（首页）
/clinics/:id               # 诊所详情页
/login                     # 登录页
/register                  # 注册页
/profile                   # 个人中心
```

### 5.2 核心组件

#### 5.2.1 地图浏览页 (MapPage)
```
┌─────────────────────────────────────────┐
│  [搜索框]                    [登录/头像] │
├─────────────────────────────────────────┤
│                                         │
│              地图区域                    │
│          (Mapbox + 诊所标记)             │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  [诊所卡片列表]                          │
│  ┌─────────────────────────────────┐   │
│  │ 爱宠动物医院        ⭐ 4.5 (128) │   │
│  │ 北京市朝阳区...                  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**核心功能**：
- 地图拖动/缩放自动加载诊所
- 点击标记显示诊所卡片
- 点击卡片跳转详情页

#### 5.2.2 诊所详情页 (ClinicDetailPage)
```
┌─────────────────────────────────────────┐
│  [← 返回]                    [收藏 ♡]   │
├─────────────────────────────────────────┤
│  [诊所图片轮播]                          │
├─────────────────────────────────────────┤
│  爱宠动物医院                            │
│  ⭐ 4.5 (128条评价)                     │
│  📍 北京市朝阳区...                      │
│  📞 010-12345678                        │
│  ℹ️ 专业宠物医疗服务...                  │
├─────────────────────────────────────────┤
│  [写评价]                                │
├─────────────────────────────────────────┤
│  用户评价                                │
│  ┌─────────────────────────────────┐   │
│  │ 👤 小明        ⭐⭐⭐⭐⭐  2024-05-21│   │
│  │ 医生很专业，环境也很好            │   │
│  │ [图片] [图片]                    │   │
│  │ 👍 12                            │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**核心功能**：
- 诊所基本信息展示
- 评价列表（分页加载）
- 发布评价（需登录）
- 收藏功能（需登录）

#### 5.2.3 评价表单 (ReviewForm)
```
┌─────────────────────────────────────────┐
│  写评价                                  │
├─────────────────────────────────────────┤
│  评分：⭐⭐⭐⭐⭐                          │
├─────────────────────────────────────────┤
│  就诊日期：[2024-05-20]                  │
├─────────────────────────────────────────┤
│  评价内容：                              │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│  上传图片：[+] [+] [+]                   │
├─────────────────────────────────────────┤
│  [取消]                      [发布评价]  │
└─────────────────────────────────────────┘
```

#### 5.2.4 个人中心 (ProfilePage)
```
┌─────────────────────────────────────────┐
│  [← 返回]                    [编辑]     │
├─────────────────────────────────────────┤
│       [头像]                             │
│       小明                               │
│       user@example.com                  │
├─────────────────────────────────────────┤
│  我的评价 (5)                            │
│  我的收藏 (3)                            │
├─────────────────────────────────────────┤
│  [退出登录]                              │
└─────────────────────────────────────────┘
```

---

## 6. 实施步骤

### 第 1 周：基础架构搭建

#### Day 1-2: 项目初始化
- [ ] 创建前端项目 (Vite + React + TypeScript)
- [ ] 创建后端项目 (Express + TypeScript)
- [ ] 配置 ESLint + Prettier
- [ ] 配置 Tailwind CSS
- [ ] 设置 Git 仓库和分支策略

#### Day 3-4: 数据库设计
- [ ] 编写数据库迁移脚本
- [ ] 配置 Drizzle ORM
- [ ] 创建种子数据（测试用）
- [ ] 编写数据库测试

#### Day 5-7: 基础 API 开发
- [ ] 实现用户认证 API (注册/登录)
- [ ] 实现诊所查询 API
- [ ] 实现诊所详情 API
- [ ] 编写 API 测试

### 第 2 周：核心功能开发

#### Day 8-10: 地图功能
- [ ] 集成 Mapbox GL JS
- [ ] 实现地图标记组件
- [ ] 实现地图范围查询
- [ ] 实现诊所卡片列表
- [ ] 地图交互优化

#### Day 11-12: 诊所详情页
- [ ] 实现诊所详情页布局
- [ ] 实现图片轮播组件
- [ ] 实现评价列表组件
- [ ] 实现收藏功能

#### Day 13-14: 评价系统
- [ ] 实现评价表单组件
- [ ] 实现评价发布 API
- [ ] 实现评价点赞功能
- [ ] 图片上传功能

### 第 3 周：用户系统与优化

#### Day 15-16: 用户系统
- [ ] 实现登录/注册页面
- [ ] 实现个人中心页面
- [ ] 实现用户信息编辑
- [ ] 实现我的评价/收藏列表

#### Day 17-18: 功能完善
- [ ] 实现搜索功能
- [ ] 实现分页加载
- [ ] 实现错误处理
- [ ] 实现加载状态

#### Day 19-21: 测试与优化
- [ ] 端到端测试
- [ ] 性能优化（懒加载、缓存）
- [ ] 移动端适配
- [ ] Bug 修复

### 第 4 周：部署与上线

#### Day 22-23: 部署准备
- [ ] 配置生产环境变量
- [ ] 配置 Docker 镜像
- [ ] 配置 CI/CD 流程
- [ ] 数据库迁移脚本

#### Day 24-25: 部署上线
- [ ] 部署后端到 Railway
- [ ] 部署前端到 Vercel
- [ ] 配置域名和 SSL
- [ ] 配置监控和日志

#### Day 26-28: 数据准备与测试
- [ ] 导入初始诊所数据
- [ ] 邀请测试用户
- [ ] 收集反馈
- [ ] 迭代优化

---

## 7. 初始数据准备

### 7.1 诊所数据来源
1. **手动录入**：北京/上海核心区域 20-30 家知名诊所
2. **爬虫采集**：从大众点评/美团采集基础信息
3. **用户贡献**：开放用户添加诊所功能

### 7.2 种子数据示例
```sql
-- 示例诊所数据
INSERT INTO clinics (name, address, latitude, longitude, phone, description) VALUES
('芭比堂动物医院（朝阳门店）', '北京市朝阳区朝阳门外大街', 39.9289, 116.4389, '010-12345678', '24小时急诊，专业宠物医疗'),
('瑞鹏宠物医院（国贸店）', '北京市朝阳区建国门外大街', 39.9075, 116.4580, '010-87654321', '连锁品牌，设备先进'),
('宠颐生动物医院', '北京市海淀区中关村大街', 39.9833, 116.3167, '010-11112222', '北大教授创办，学术背景强');

-- 示例用户数据
INSERT INTO users (email, password_hash, nickname) VALUES
('test@example.com', '$2b$10$...', '测试用户');

-- 示例评价数据
INSERT INTO reviews (clinic_id, user_id, rating, content, visit_date) VALUES
(1, 1, 5, '医生很专业，态度也很好，狗狗看病很顺利', '2024-05-20'),
(1, 1, 4, '环境不错，就是人有点多，等了一会儿', '2024-05-18');
```

---

## 8. 技术难点与解决方案

### 8.1 地图性能优化
**问题**：大量标记导致地图卡顿

**解决方案**：
```typescript
// 1. 使用聚合标记
import { Cluster } from 'mapbox-gl';

// 2. 限制查询范围
const MAX_RESULTS = 100;

// 3. 懒加载标记
const loadMarkersInView = debounce(() => {
  const bounds = map.getBounds();
  fetchClinics(bounds);
}, 300);
```

### 8.2 图片上传
**问题**：图片存储和 CDN

**解决方案**：
```typescript
// 使用 Cloudinary
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 上传图片
const uploadImage = async (file: Buffer) => {
  const result = await cloudinary.uploader.upload(file, {
    folder: 'firefly/reviews',
    transformation: [
      { width: 800, crop: 'limit' },
      { quality: 'auto' }
    ]
  });
  return result.secure_url;
};
```

### 8.3 评分计算
**问题**：评分更新的一致性

**解决方案**：
```sql
-- 使用数据库触发器自动更新
CREATE OR REPLACE FUNCTION update_clinic_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE clinics
  SET 
    rating_avg = (
      SELECT AVG(rating)::DECIMAL(2,1)
      FROM reviews
      WHERE clinic_id = NEW.clinic_id
    ),
    rating_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE clinic_id = NEW.clinic_id
    )
  WHERE id = NEW.clinic_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_clinic_rating();
```

---

## 9. 测试策略

### 9.1 单元测试
```typescript
// 后端 API 测试
describe('Clinic API', () => {
  it('should return clinics in bounds', async () => {
    const res = await request(app)
      .get('/api/clinics')
      .query({ bounds: '39.9,116.3,40.0,116.4' });
    
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });
});

// 前端组件测试
describe('ClinicCard', () => {
  it('should render clinic info', () => {
    render(<ClinicCard clinic={mockClinic} />);
    expect(screen.getByText('爱宠动物医院')).toBeInTheDocument();
  });
});
```

### 9.2 集成测试
- 用户注册 → 登录 → 发布评价 → 查看评价
- 地图浏览 → 点击诊所 → 查看详情 → 收藏

### 9.3 E2E 测试
使用 Playwright 进行端到端测试
```typescript
test('user can post review', async ({ page }) => {
  await page.goto('/');
  await page.click('text=登录');
  await page.fill('input[name=email]', 'test@example.com');
  await page.fill('input[name=password]', 'password');
  await page.click('button:has-text("登录")');
  
  await page.click('text=爱宠动物医院');
  await page.click('text=写评价');
  await page.fill('textarea', '医生很专业');
  await page.click('button:has-text("发布")');
  
  await expect(page.locator('text=医生很专业')).toBeVisible();
});
```

---

## 10. 监控与运维

### 10.1 日志系统
```typescript
// 使用 Winston
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// 记录关键操作
logger.info('User registered', { userId, email });
logger.error('Database error', { error, query });
```

### 10.2 性能监控
```typescript
// 使用 Sentry
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0
});

// 监控 API 性能
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
```

### 10.3 数据库备份
```bash
# 每日自动备份
0 2 * * * pg_dump firefly > /backups/firefly_$(date +\%Y\%m\%d).sql
```

---

## 11. 成功指标

### 11.1 技术指标
- [ ] 首屏加载时间 < 2s
- [ ] API 响应时间 < 200ms (P95)
- [ ] 地图交互流畅 (60fps)
- [ ] 移动端适配完成

### 11.2 产品指标
- [ ] 录入诊所数量 > 50
- [ ] 注册用户数 > 100
- [ ] 发布评价数 > 50
- [ ] 日活用户 > 20

### 11.3 质量指标
- [ ] 单元测试覆盖率 > 70%
- [ ] 零严重 Bug
- [ ] 用户反馈满意度 > 4.0/5.0

---

## 12. 风险与应对

### 12.1 技术风险
| 风险 | 影响 | 应对措施 |
|------|------|----------|
| Mapbox 配额超限 | 高 | 监控使用量，准备降级方案 |
| 图片存储成本 | 中 | 限制上传大小和数量 |
| 数据库性能 | 中 | 添加索引，使用缓存 |

### 12.2 产品风险
| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 初始数据不足 | 高 | 手动录入 + 爬虫采集 |
| 用户活跃度低 | 高 | 邀请种子用户，激励机制 |
| 恶意评价 | 中 | 内容审核，举报机制 |

---

## 13. 后续迭代方向

### V1.1 (MVP + 1 个月)
- 高级筛选（服务类型、价格区间）
- 诊所对比功能
- 评价回复功能
- 用户等级系统

### V1.2 (MVP + 2 个月)
- 预约系统
- 在线咨询
- 宠物健康档案
- 诊所认证服务

### V2.0 (MVP + 6 个月)
- 小程序版本
- 医疗知识库
- AI 智能推荐
- 数据分析平台

---

## 附录

### A. 环境变量配置
```env
# 后端 .env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:pass@host:5432/firefly
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
MAPBOX_TOKEN=your_mapbox_token

# 前端 .env
VITE_API_URL=https://api.firefly.com
VITE_MAPBOX_TOKEN=your_mapbox_token
```

### B. 开发命令
```bash
# 前端
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run preview      # 预览生产版本
npm run test         # 运行测试

# 后端
npm run dev          # 启动开发服务器
npm run build        # 编译 TypeScript
npm run start        # 启动生产服务器
npm run migrate      # 运行数据库迁移
npm run seed         # 导入种子数据
npm run test         # 运行测试
```

### C. 参考资源
- [Mapbox GL JS 文档](https://docs.mapbox.com/mapbox-gl-js/)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [shadcn/ui 组件库](https://ui.shadcn.com/)
- [Railway 部署指南](https://docs.railway.app/)
