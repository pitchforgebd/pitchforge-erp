# Build from the repository root: docker build -f infra/docker/api.Dockerfile .
# The build stage is glibc because pnpm's Node download has no musl build. Only pure JavaScript
# reaches the final stage: msgpackr falls back from its native addon by itself.
FROM node:26.13.0-bookworm-slim@sha256:add5c17c14752c54d2f3d519ec46a3815684d41c33f198bcb09fb998f7dcbf68 AS build
WORKDIR /repo
ENV TURBO_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@12.16.1
COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts
RUN pnpm exec turbo run build --filter=@pitchforge/api
RUN pnpm --filter @pitchforge/api deploy --prod --ignore-scripts /deploy

FROM node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS runtime
WORKDIR /app
# Owned by root, so the running process cannot change its own code.
COPY --from=build /deploy/ ./
# No package manager and no shell: an attacker who gets code running has nothing to work with.
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
      /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg /sbin/apk /etc/apk /lib/apk /usr/share/apk \
    && /bin/busybox find /bin /sbin /usr/bin /usr/sbin -type l -exec /bin/busybox rm -f {} + \
    && /bin/busybox rm -f /bin/busybox
USER 10001:10001
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "--conditions=dist", "dist/main.js"]
