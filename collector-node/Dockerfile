FROM oven/bun:1.3.14 AS deps

WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3.14 AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Shanghai

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -g 1001 appgroup \
    && useradd -u 1001 -g appgroup -M -s /usr/sbin/nologin appuser \
    && mkdir -p /app/exports \
    && chown -R appuser:appgroup /app

COPY --from=deps --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --chown=appuser:appgroup package.json ./
COPY --chown=appuser:appgroup src ./src
COPY --chown=appuser:appgroup tsconfig.json ./

USER 1001
CMD ["bun", "src/main.ts"]
