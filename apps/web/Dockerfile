FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/gateway/package.json ./apps/gateway/package.json

RUN npm ci

COPY apps/web ./apps/web

RUN npm run build --workspace=@vetflow/web


FROM nginx:stable-alpine AS production

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80