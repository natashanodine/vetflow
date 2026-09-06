FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/gateway/package.json ./apps/gateway/package.json

RUN npm ci

COPY apps/gateway ./apps/gateway

RUN npm run build --workspace=@vetflow/gateway


FROM node:24-bookworm-slim AS production

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/gateway/package.json ./apps/gateway/package.json

RUN npm ci --omit=dev

COPY --from=build /app/apps/gateway/dist ./apps/gateway/dist

USER node

EXPOSE 3000

CMD ["node", "apps/gateway/dist/server.js"]