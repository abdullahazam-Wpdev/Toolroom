FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-venv util-linux ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev
COPY infra infra
RUN npx prisma generate --schema infra/schema.prisma
COPY workers workers
COPY packages/jobs packages/jobs
COPY scripts/backend/worker.ts scripts/backend/worker.ts
RUN python3 -m venv /opt/ai && /opt/ai/bin/pip install --no-cache-dir -r workers/ai/requirements.lock
ENV AI_PYTHON=/opt/ai/bin/python3
ENV JOB_STORAGE_DIR=/data/jobs
ENV MODEL_STORAGE_DIR=/models
USER node
CMD ["node", "scripts/backend/worker.ts"]
