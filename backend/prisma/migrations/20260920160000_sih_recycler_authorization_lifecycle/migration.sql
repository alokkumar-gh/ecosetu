-- AlterEnum
ALTER TYPE "recycler_authorization_status" ADD VALUE IF NOT EXISTS 'PROVISIONAL';
ALTER TYPE "recycler_authorization_status" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "recycler_authorization_status" ADD VALUE IF NOT EXISTS 'SUSPENDED';

-- AlterTable
ALTER TABLE "recycler_profiles" 
  ALTER COLUMN "authorization_status" SET DEFAULT 'PENDING'::recycler_authorization_status,
  ADD COLUMN IF NOT EXISTS "accepted_subcategories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "authorization_number" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "issuing_authority" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "authorization_valid_from" DATE,
  ADD COLUMN IF NOT EXISTS "authorization_valid_till" DATE,
  ADD COLUMN IF NOT EXISTS "operational_phone" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "operational_email" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "verified_by" UUID,
  ADD COLUMN IF NOT EXISTS "verification_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT TRUE;

-- AddForeignKey
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recycler_profiles_verified_by_fkey'
  ) THEN
    ALTER TABLE "recycler_profiles" 
      ADD CONSTRAINT "recycler_profiles_verified_by_fkey" 
      FOREIGN KEY ("verified_by") REFERENCES "users"("id") 
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
