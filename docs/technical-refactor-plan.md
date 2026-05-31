# Firefly 技术重构方案

## 1. 重构背景

### 1.1 产品定位调整
- **原定位**：流浪动物救助地图（点位标记、风险预警、社区治理）
- **新定位**：宠物医疗版大众点评（诊所评价、医疗服务、用户社区）

### 1.2 核心变化
| 维度 | 原方案 | 新方案 |
|------|--------|--------|
| 核心实体 | 点位（投毒点、爱心粮仓） | 诊所（医院、诊所） |
| 地图功能 | 风险预警地图 | 诊所分布地图 |
| 社区功能 | 社区共识治理 | 评价系统 + 用户互动 |
| 商业模式 | 赞助补给位 | 诊所认证服务 |

---

## 2. 整体架构调整

### 2.1 系统架构图
```
┌─────────────────────────────────────────────────────────────┐
│                        前端层 (React)                        │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  地图浏览    │  诊所详情    │  评价系统    │  用户中心      │
│  (Mapbox)    │  (详情页)    │  (评分评论)  │  (个人主页)    │
└──────────────┴──────────────┴──────────────┴────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    API 网关层 (Express)                      │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  诊所服务    │  评价服务    │  用户服务    │  认证服务      │
└──────────────┴──────────────┴──────────────┴────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   数据层 (SQLite/PostgreSQL)                 │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  诊所表      │  评价表      │  用户表      │  认证表        │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

### 2.2 技术栈选择
- **前端**：React 18 + TypeScript + Vite
- **地图**：Mapbox GL JS
- **后端**：Node.js + Express + TypeScript
- **数据库**：SQLite (开发) / PostgreSQL (生产)
- **认证**：JWT + Passport.js
- **部署**：Docker + Vercel/Railway

---

## 3. 数据模型重构

### 3.1 核心实体关系图
```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    User      │──────>│   Review     │<──────│   Clinic     │
│  (用户)      │ 1:N   │  (评价)      │ N:1   │  (诊所)      │
└──────────────┘       └──────────────┘       └──────────────┘
       │                      │                       │
       │ 1:N                  │ 1:N                   │ 1:N
       ↓                      ↓                       ↓
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Favorite   │       │  ReviewLike  │       │ClinicService │
│  (收藏)      │       │ (评价点赞)   │       │ (诊所服务)   │
└──────────────┘       └──────────────┘       └──────────────┘
```

### 3.2 数据表设计

#### 3.2.1 诊所表 (clinics)
```sql
CREATE TABLE clinics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- 诊所名称
  address TEXT NOT NULL,                 -- 地址
  latitude REAL NOT NULL,                -- 纬度
  longitude REAL NOT NULL,               -- 经度
  phone TEXT,                            -- 电话
  business_hours TEXT,                   -- 营业时间 (JSON)
  description TEXT,                      -- 简介
  images TEXT,                           -- 图片 (JSON array)
  
  -- 评分统计
  rating_avg REAL DEFAULT 0,             -- 平均评分
  rating_count INTEGER DEFAULT 0,        -- 评价数量
  
  -- 认证状态
  is_verified BOOLEAN DEFAULT FALSE,     -- 是否认证
  verified_at TIMESTAMP,                 -- 认证时间
  
  -- 服务标签
  services TEXT,                         -- 服务项目 (JSON array)
  
  -- 元数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 索引
  INDEX idx_location (latitude, longitude),
  INDEX idx_rating (rating_avg DESC)
);
```

#### 3.2.2 评价表 (reviews)
```sql
CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id INTEGER NOT NULL,            -- 诊所 ID
  user_id INTEGER NOT NULL,              -- 用户 ID
  
  -- 评分维度
  rating_overall INTEGER NOT NULL,       -- 总体评分 (1-5)
  rating_service INTEGER,                -- 服务评分
  rating_environment INTEGER,            -- 环境评分
  rating_price INTEGER,                  -- 价格评分
  
  -- 评价内容
  content TEXT NOT NULL,                 -- 评价内容
  images TEXT,                           -- 图片 (JSON array)
  
  -- 就诊信息
  visit_date DATE,                       -- 就诊日期
  pet_type TEXT,                         -- 宠物类型
  treatment_type TEXT,                   -- 治疗类型
  
  -- 互动统计
  like_count INTEGER DEFAULT 0,          -- 点赞数
  reply_count INTEGER DEFAULT 0,         -- 回复数
  
  -- 状态
  status TEXT DEFAULT 'published',       -- published/hidden/deleted
  
  -- 元数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  
  INDEX idx_clinic (clinic_id),
  INDEX idx_user (user_id),
  INDEX idx_created (created_at DESC)
);
```

#### 3.2.3 用户表 (users)
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  
  -- 用户信息
  nickname TEXT,
  avatar TEXT,
  bio TEXT,
  
  -- 宠物信息
  pets TEXT,                             -- 宠物列表 (JSON array)
  
  -- 统计
  review_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  
  -- 权限
  role TEXT DEFAULT 'user',              -- user/clinic_owner/admin
  
  -- 元数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3.2.4 收藏表 (favorites)
```sql
CREATE TABLE favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  clinic_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (clinic_id) REFERENCES clinics(id),
  
  UNIQUE(user_id, clinic_id),
  INDEX idx_user (user_id)
);
```

---

## 4. API 设计

### 4.1 诊所服务 API

#### GET /api/clinics
查询诊所列表（支持地图范围查询）
```typescript
Query: {
  lat?: number;        // 中心纬度
  lng?: number;        // 中心经度
  radius?: number;     // 半径 (km)
  bounds?: string;     // 地图边界 "sw_lat,sw_lng,ne_lat,ne_lng"
  services?: string[]; // 服务筛选
  rating_min?: number; // 最低评分
  page?: number;
  limit?: number;
}

Response: {
  data: Clinic[];
  total: number;
  page: number;
  limit: number;
}
```

#### GET /api/clinics/:id
获取诊所详情
```typescript
Response: {
  clinic: Clinic;
  reviews: Review[];      // 最新评价
  nearby: Clinic[];       // 附近诊所
}
```

#### POST /api/clinics
创建诊所（需要认证）
```typescript
Body: {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  business_hours?: object;
  description?: string;
  services?: string[];
}
```

### 4.2 评价服务 API

#### GET /api/reviews
查询评价列表
```typescript
Query: {
  clinic_id?: number;
  user_id?: number;
  rating_min?: number;
  sort?: 'latest' | 'rating' | 'helpful';
  page?: number;
  limit?: number;
}
```

#### POST /api/reviews
发布评价（需要认证）
```typescript
Body: {
  clinic_id: number;
  rating_overall: number;
  rating_service?: number;
  rating_environment?: number;
  rating_price?: number;
  content: string;
  images?: string[];
  visit_date?: string;
  pet_type?: string;
  treatment_type?: string;
}
```

#### POST /api/reviews/:id/like
点赞评价（需要认证）

### 4.3 用户服务 API

#### GET /api/users/:id
获取用户信息
```typescript
Response: {
  user: User;
  reviews: Review[];      // 用户评价
  favorites: Clinic[];    // 收藏诊所
}
```

#### POST /api/users/:id/favorites
收藏诊所（需要认证）
```typescript
Body: {
  clinic_id: number;
}
```

---

## 5. 前端架构

### 5.1 页面结构
```
src/
├── pages/
│   ├── MapPage.tsx              # 地图浏览页
│   ├── ClinicDetailPage.tsx     # 诊所详情页
│   ├── ReviewPage.tsx           # 评价页面
│   ├── UserProfilePage.tsx      # 用户主页
│   └── AuthPage.tsx             # 登录注册页
├── components/
│   ├── Map/
│   │   ├── MapView.tsx          # 地图组件
│   │   ├── ClinicMarker.tsx     # 诊所标记
│   │   └── ClusterMarker.tsx    # 聚合标记
│   ├── Clinic/
│   │   ├── ClinicCard.tsx       # 诊所卡片
│   │   ├── ClinicInfo.tsx       # 诊所信息
│   │   └── ClinicServices.tsx   # 服务列表
│   ├── Review/
│   │   ├── ReviewList.tsx       # 评价列表
│   │   ├── ReviewCard.tsx       # 评价卡片
│   │   ├── ReviewForm.tsx       # 评价表单
│   │   └── RatingStars.tsx      # 评分组件
│   └── User/
│       ├── UserCard.tsx         # 用户卡片
│       └── FavoriteList.tsx     # 收藏列表
├── hooks/
│   ├── useClinic.ts             # 诊所数据
│   ├── useReview.ts             # 评价数据
│   └── useAuth.ts               # 认证状态
└── services/
    ├── api.ts                   # API 客户端
    └── mapbox.ts                # 地图服务
```

### 5.2 状态管理
使用 React Context + Custom Hooks
```typescript
// AuthContext
const AuthContext = createContext<AuthState>();

// MapContext
const MapContext = createContext<MapState>();

// ReviewContext
const ReviewContext = createContext<ReviewState>();
```

---

## 6. 迁移策略

### 6.1 数据迁移
```sql
-- Step 1: 保留现有 points 表作为历史数据
ALTER TABLE points RENAME TO points_legacy;

-- Step 2: 创建新表结构
-- (执行上述 CREATE TABLE 语句)

-- Step 3: 迁移可复用数据
INSERT INTO clinics (name, address, latitude, longitude, description, created_at)
SELECT 
  name,
  address,
  latitude,
  longitude,
  description,
  created_at
FROM points_legacy
WHERE type = 'clinic';  -- 如果有诊所类型的点位

-- Step 4: 迁移用户数据
-- (保持 users 表结构，添加新字段)
ALTER TABLE users ADD COLUMN pets TEXT;
ALTER TABLE users ADD COLUMN review_count INTEGER DEFAULT 0;
```

### 6.2 API 迁移
1. **阶段 1**：新旧 API 并存
   - 保留 `/api/points` 端点（标记为 deprecated）
   - 新增 `/api/clinics` 端点
   - 前端逐步切换到新 API

2. **阶段 2**：完全切换
   - 移除旧 API 端点
   - 更新所有前端调用

### 6.3 前端迁移
1. **阶段 1**：组件重构
   - 创建新的 Clinic 组件
   - 保留旧的 Point 组件
   - 使用 Feature Flag 控制显示

2. **阶段 2**：路由切换
   - 更新路由配置
   - 重定向旧路由到新路由

---

## 7. 部署方案

### 7.1 开发环境
```bash
# 本地开发
npm run dev          # 启动前端 (Vite)
npm run server:dev   # 启动后端 (Express)
```

### 7.2 生产环境
```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://backend:4000
  
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://...
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./data:/app/data
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=firefly
      - POSTGRES_USER=firefly
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 8. 风险评估

### 8.1 技术风险
| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 数据迁移失败 | 高 | 中 | 完整备份 + 回滚方案 |
| API 兼容性问题 | 中 | 中 | 版本控制 + 灰度发布 |
| 地图性能问题 | 中 | 低 | 聚合标记 + 懒加载 |
| 评价系统滥用 | 高 | 中 | 内容审核 + 限流 |

### 8.2 业务风险
| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 用户流失 | 高 | 中 | 平滑迁移 + 用户通知 |
| 诊所数据不足 | 高 | 高 | 爬虫导入 + 用户贡献 |
| 评价真实性 | 高 | 中 | 实名认证 + 举报机制 |

---

## 9. 实施计划

### 9.1 第一阶段：基础重构 (2 周)
- [ ] 数据库表结构设计
- [ ] 核心 API 开发（诊所、评价）
- [ ] 地图组件重构
- [ ] 诊所详情页开发

### 9.2 第二阶段：功能完善 (2 周)
- [ ] 评价系统开发
- [ ] 用户中心开发
- [ ] 收藏功能开发
- [ ] 搜索筛选功能

### 9.3 第三阶段：数据迁移 (1 周)
- [ ] 数据迁移脚本
- [ ] 数据验证
- [ ] 灰度发布

### 9.4 第四阶段：优化上线 (1 周)
- [ ] 性能优化
- [ ] 测试验证
- [ ] 正式上线

---

## 10. 后续优化方向

### 10.1 功能增强
- 诊所预约系统
- 在线咨询功能
- 宠物健康档案
- 医疗知识库

### 10.2 技术优化
- 引入 Redis 缓存
- 图片 CDN 加速
- 全文搜索 (Elasticsearch)
- 实时通知 (WebSocket)

### 10.3 商业化
- 诊所认证服务
- 广告位系统
- 数据分析平台
- API 开放平台
