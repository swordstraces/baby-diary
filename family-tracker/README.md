# 家庭喂养协作（私有化 Web 版）

微信小程序「宝贝日记」之外的自建版本：浏览器访问、Docker 部署、数据在你自己的 NAS 上。

详细步骤见 [DEPLOY.md](./DEPLOY.md)。

## 一键部署（NAS / 任意装了 Docker 的机器）

若本仓库在 `baby-tracker/family-tracker`，先进入该目录；若你**只拷贝了**本文件夹到 NAS，则直接进入拷贝后的目录即可。

```bash
cd family-tracker
cp .env.example .env
# 编辑 .env：JWT_SECRET、WEB_ORIGIN（与浏览器访问地址一致）
docker compose up -d --build
```

浏览器打开：`http://你的机器IP:8080`（默认端口见 `.env` 里的 `WEB_PORT`）。

首次使用：「创建家庭」→ 记住邀请码 → 家人「加入家庭」→ 各人设置自己的登录代号与密码。
