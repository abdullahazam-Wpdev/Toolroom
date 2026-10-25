-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "AuditJob" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "report" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolEvent" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaJob" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
    "inputBytes" INTEGER NOT NULL,
    "outputBytes" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditJob_expiresAt_idx" ON "AuditJob"("expiresAt");

-- CreateIndex
CREATE INDEX "ToolEvent_toolId_createdAt_idx" ON "ToolEvent"("toolId", "createdAt");

-- CreateIndex
CREATE INDEX "MediaJob_expiresAt_idx" ON "MediaJob"("expiresAt");

-- CreateIndex
CREATE INDEX "MediaJob_status_idx" ON "MediaJob"("status");

