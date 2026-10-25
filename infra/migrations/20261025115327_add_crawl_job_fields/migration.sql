-- AlterTable
ALTER TABLE "AuditJob" ADD COLUMN     "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "error" TEXT,
ADD COLUMN     "maxPages" INTEGER NOT NULL,
ADD COLUMN     "pagesCrawled" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pagesDiscovered" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tokenHash" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "AuditJob_status_idx" ON "AuditJob"("status");
