FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/gateway/package.json ./apps/gateway/package.json
COPY apps/clinic-service/package.json ./apps/clinic-service/package.json
COPY apps/scheduling-service/package.json ./apps/scheduling-service/package.json
COPY apps/identity-service/package.json ./apps/identity-service/package.json

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
COPY apps/scheduling-service/package.json ./apps/scheduling-service/package.json
COPY apps/identity-service/package.json ./apps/identity-service/package.json

RUN npm ci --omit=dev

COPY --from=build \
  /app/apps/clinic-service/dist \
  ./apps/clinic-service/dist

# Uploaded files live in a named volume mounted here; Docker copies this
# ownership into the empty volume so the node user can write to it.
RUN mkdir -p /data/uploads && chown node:node /data/uploads
ENV UPLOADS_DIR=/data/uploads

USER node

EXPOSE 3001

CMD ["node", "apps/clinic-service/dist/server.js"]
