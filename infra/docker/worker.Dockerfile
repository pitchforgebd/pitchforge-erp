# Build from the repository root: docker build -f infra/docker/worker.Dockerfile .
# See api.Dockerfile for why the two stages differ.
FROM node:26.13.0-bookworm-slim@sha256:add5c17c14752c54d2f3d519ec46a3815684d41c33f198bcb09fb998f7dcbf68 AS build
WORKDIR /repo
ENV TURBO_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@12.16.1
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm exec turbo run build --filter=@pitchforge/worker
RUN pnpm --filter @pitchforge/worker deploy --prod --ignore-scripts /deploy

FROM node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS runtime
WORKDIR /app
COPY --from=build /deploy/ ./
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
      /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg /sbin/apk /etc/apk /lib/apk /usr/share/apk \
    && /bin/busybox find /bin /sbin /usr/bin /usr/sbin -type l -exec /bin/busybox rm -f {} + \
    && /bin/busybox rm -f /bin/busybox
USER 10001:10001
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
