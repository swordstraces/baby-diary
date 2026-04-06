# 私有化部署（Docker）

本目录 `family-tracker/` 可单独拷贝到任意机器使用，不依赖上级仓库里的微信小程序代码。

以下命令均在 **本目录**（`family-tracker`）下执行。

## 架构

- `web`: Nginx 托管前端静态资源，并把 `/api` 反向代理到 `api`
- `api`: Fastify + Prisma + PostgreSQL
- `db`: PostgreSQL 16

## 快速启动

1. 复制环境变量模板并按需修改：

```bash
cp .env.example .env
```

务必把 `JWT_SECRET` 改成随机长字符串；把 `WEB_ORIGIN` 改成你实际在浏览器里打开前端的地址（协议、主机、端口要一致），否则浏览器会因 CORS 拦请求。

2. 启动：

```bash
docker compose up -d --build
```

3. 浏览器打开 `http://localhost:8080`（或你映射的端口），先「创建家庭」，把邀请码发给家人，其他成员用「加入家庭」。

## 本地开发（可选）

### API

需本机已有可访问的 Postgres，或使用 `docker compose up db` 只起数据库后再连。

```bash
cd api
export DATABASE_URL="postgresql://baby:baby@localhost:5432/babytracker"
export JWT_SECRET="dev-secret"
export WEB_ORIGIN="http://localhost:5173"
npm install
npx prisma migrate deploy
npm run dev
```

### Web

```bash
cd web
npm install
npm run dev
```

Vite 已把 `/api` 代理到 `http://127.0.0.1:3000`。

## 数据与备份

Postgres 数据在 Docker volume `pgdata` 中。定期用 NAS 快照或 `pg_dump` 备份。

## 端口说明

`docker-compose.yml` 默认只对外映射 **web 的 80** 到宿主机 `WEB_PORT`（默认 8080）。`api` 不映射到宿主机，只能通过 Docker 内网被 `web` 访问；若你要直接调试 API，可自行在 compose 里加 `ports`。
