FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/gateway/package.json ./apps/gateway/package.json
COPY apps/clinic-service/package.json ./apps/clinic-service/package.json
COPY apps/scheduling-service/package.json ./apps/scheduling-service/package.json

RUN npm ci

COPY apps/scheduling-service ./apps/scheduling-service

RUN npm run build --workspace=@vetflow/scheduling-service

FROM node:24-bookworm-slim AS production

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/gateway/package.json ./apps/gateway/package.json
COPY apps/clinic-service/package.json ./apps/clinic-service/package.json
COPY apps/scheduling-service/package.json ./apps/scheduling-service/package.json

RUN npm ci --omit=dev

COPY --from=build /app/apps/scheduling-service/dist ./apps/scheduling-service/dist
COPY apps/scheduling-service/prisma ./apps/scheduling-service/prisma
COPY apps/scheduling-service/prisma.config.ts ./apps/scheduling-service/prisma.config.ts

USER node
EXPOSE 3002

CMD ["sh", "-c", "npm exec --workspace=@vetflow/scheduling-service -- prisma migrate deploy && node apps/scheduling-service/dist/server.js"]
