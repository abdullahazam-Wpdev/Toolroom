-- CreateTable
CREATE TABLE "RenderedAuditJob" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "report" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RenderedAuditJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RenderedAuditJob_expiresAt_idx" ON "RenderedAuditJob"("expiresAt");

-- CreateIndex
CREATE INDEX "RenderedAuditJob_status_idx" ON "RenderedAuditJob"("status");
