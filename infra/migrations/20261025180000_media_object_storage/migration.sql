-- Additive only. Apply through the operator's normal migration release process.
ALTER TABLE "MediaJob" ADD COLUMN "storageBackend" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN "inputSha256" TEXT,
ADD COLUMN "inputMime" TEXT;
