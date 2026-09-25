-- AlterEnum
ALTER TYPE "verification_status" ADD VALUE IF NOT EXISTS 'NOT_SUBMITTED';
ALTER TYPE "verification_status" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "verification_status" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "verification_status" ADD VALUE IF NOT EXISTS 'CHANGES_REQUIRED';

-- AlterTable
ALTER TABLE "verifications" 
  ADD COLUMN IF NOT EXISTS "change_request_options" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "change_request_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "document_number_masked" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "document_type" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "file_size" INTEGER,
  ADD COLUMN IF NOT EXISTS "mime_type" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "role" "user_role",
  ADD COLUMN IF NOT EXISTS "storage_key" VARCHAR(255);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_v_role" ON "verifications"("role");
