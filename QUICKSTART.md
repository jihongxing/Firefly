# Firefly 快速启动指南

## 当前环境状态

✅ **开发环境已搭建完成**（2024-01-XX）

- PostgreSQL 数据库运行在 Podman 容器中
- Prisma Schema 已定义并迁移
- 后端服务器配置完成
- 前端开发环境就绪

---

## 启动开发环境

### 1. 启动数据库

```bash
# 启动 PostgreSQL 容器
podman start firefly-postgres

# 验证数据库运行状态
podman ps | grep firefly-postgres
```

### 2. 启动后端服务器

```bash
# 进入后端目录
cd backend

# 启动开发服务器（带热重载）
npm run dev
```

后端将运行在 **http://localhost:3000**

### 3. 启动前端服务器

```bash
# 进入前端目录
cd frontend

# 启动开发服务器
npm run dev
```

前端将运行在 **http://localhost:5173**

---

## 停止开发环境

### 停止后端服务器
在运行 `npm run dev` 的终端按 `Ctrl+C`

### 停止数据库
```bash
# 停止容器（保留数据）
podman stop firefly-postgres

# 如需完全删除容器和数据
podman rm -f firefly-postgres
podman volume rm firefly-postgres-data
```

---

## 数据库管理

### 查看数据库连接信息
```bash
# 数据库连接字符串
postgresql://firefly:firefly123@localhost:5432/firefly
```

### 运行数据库迁移
```bash
cd backend
npx prisma migrate dev
```

### 重置数据库
```bash
cd backend
npx prisma migrate reset
```

### 查看数据库内容（Prisma Studio）
```bash
cd backend
npx prisma studio
```

访问 **http://localhost:5555** 查看数据

---

## 常见问题

### 数据库连接失败
```bash
# 检查容器是否运行
podman ps

# 检查容器日志
podman logs firefly-postgres

# 重启容器
podman restart firefly-postgres
```

### 端口被占用
```bash
# 查看端口占用
netstat -ano | findstr :3000
netstat -ano | findstr :5432

# 修改端口（在 .env 文件中）
PORT=3001  # 后端端口
```

### Prisma Client 未生成
```bash
cd backend
npx prisma generate
```

---

## 下一步

参考 [ROADMAP.md](ROADMAP.md) 继续实现：
- Phase 1: 后端核心 API
- Phase 2: 前端基础组件
- Phase 3: 核心功能实现

---

**最后更新**: 2024-01-XX  
**环境**: Windows 11 + Podman + Node.js 20+
