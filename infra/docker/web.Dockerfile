# Build from the repository root.
#   Staging, with the mock API: docker build -f infra/docker/web.Dockerfile .
#   Production, without it:     docker build -f infra/docker/web.Dockerfile --build-arg BUILD_WITHOUT_MOCKS=true .
# See api.Dockerfile for why the two stages differ.
FROM node:26.13.0-bookworm-slim@sha256:add5c17c14752c54d2f3d519ec46a3815684d41c33f198bcb09fb998f7dcbf68 AS build
ARG BUILD_WITHOUT_MOCKS=false
WORKDIR /repo
ENV TURBO_TELEMETRY_DISABLED=1 NEXT_TELEMETRY_DISABLED=1 BUILD_STANDALONE=true
ENV BUILD_WITHOUT_MOCKS=$BUILD_WITHOUT_MOCKS
RUN npm install --global pnpm@12.16.1
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @pitchforge/web run build

FROM node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS runtime
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone/ ./
COPY --from=build /repo/apps/web/.next/static/ ./apps/web/.next/static/
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
      /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg /sbin/apk /etc/apk /lib/apk /usr/share/apk \
    && /bin/busybox find /bin /sbin /usr/bin /usr/sbin -type l -exec /bin/busybox rm -f {} + \
    && /bin/busybox rm -f /bin/busybox
USER 10001:10001
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
