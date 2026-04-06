FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN test -f src/routes/auth.ts && test -f src/routes/me.ts && test -f src/routes/records.ts && test -f src/routes/handoff.ts || \
  (echo "ERROR: api/src/routes 不完整。请把完整 family-tracker/api 目录同步到构建环境（需包含 routes 下 4 个 .ts 文件）。" && exit 1)

RUN npx prisma generate && npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
