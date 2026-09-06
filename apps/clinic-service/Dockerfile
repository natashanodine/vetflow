FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/gateway/package.json ./apps/gateway/package.json
COPY apps/clinic-service/package.json ./apps/clinic-service/package.json

RUN npm ci

COPY apps/clinic-service ./apps/clinic-service

RUN npm run build --workspace=@vetflow/clinic-service


FROM node:24-bookworm-slim AS production

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/gateway/package.json ./apps/gateway/package.json
COPY apps/clinic-service/package.json ./apps/clinic-service/package.json

RUN npm ci --omit=dev

COPY --from=build \
  /app/apps/clinic-service/dist \
  ./apps/clinic-service/dist

USER node

EXPOSE 3001

CMD ["node", "apps/clinic-service/dist/server.js"]