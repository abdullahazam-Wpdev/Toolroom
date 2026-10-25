FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-venv util-linux ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY infra infra
RUN npm ci
RUN npx prisma generate --schema infra/schema.prisma && npm prune --omit=dev --ignore-scripts
COPY workers workers
COPY packages/jobs packages/jobs
COPY packages/storage packages/storage
COPY packages/core packages/core
COPY apps/web/src/lib apps/web/src/lib
COPY scripts/backend/worker.ts scripts/backend/worker.ts
RUN python3 -m venv /opt/ai && /opt/ai/bin/pip install --no-cache-dir -r workers/ai/requirements.lock
ENV AI_PYTHON=/opt/ai/bin/python3
ENV JOB_STORAGE_DIR=/data/jobs
ENV MODEL_STORAGE_DIR=/models
USER node
CMD ["node", "scripts/backend/worker.ts"]
