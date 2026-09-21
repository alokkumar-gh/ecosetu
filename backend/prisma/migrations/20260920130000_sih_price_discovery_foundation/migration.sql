-- CreateEnum PriceUnit
CREATE TYPE "price_unit" AS ENUM ('PER_KG', 'PER_UNIT', 'PER_LOT');

-- CreateEnum PriceSource
CREATE TYPE "price_source" AS ENUM ('ADMIN_VERIFIED', 'RECYCLER_OFFER', 'IMPORTED_MARKET_DATA');

-- CreateEnum PriceStatus
CREATE TYPE "price_status" AS ENUM ('ACTIVE', 'EXPIRED', 'PENDING_REVIEW', 'REJECTED');

-- CreateTable
CREATE TABLE "price_data" (
    "id" UUID NOT NULL,
    "category" "material_category" NOT NULL,
    "subcategory" VARCHAR(100),
    "location" VARCHAR(100) NOT NULL DEFAULT 'ALL',
    "buying_price" DECIMAL(10,2) NOT NULL,
    "quoted_price" DECIMAL(10,2),
    "unit" "price_unit" NOT NULL DEFAULT 'PER_KG',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "source" "price_source" NOT NULL DEFAULT 'ADMIN_VERIFIED',
    "status" "price_status" NOT NULL DEFAULT 'ACTIVE',
    "source_reference" VARCHAR(255),
    "effective_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" TIMESTAMPTZ(6),
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_pd_category" ON "price_data"("category");
CREATE INDEX "idx_pd_location" ON "price_data"("location");
CREATE INDEX "idx_pd_status" ON "price_data"("status");
CREATE INDEX "idx_pd_effective" ON "price_data"("effective_date");

-- AddForeignKey
ALTER TABLE "price_data" ADD CONSTRAINT "price_data_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
