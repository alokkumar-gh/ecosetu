-- CreateEnum
CREATE TYPE "address_type" AS ENUM ('HOME', 'OFFICE', 'OTHER');

-- AlterTable
ALTER TABLE "collector_profiles"
ADD COLUMN "service_area" VARCHAR(255),
ADD COLUMN "city" VARCHAR(100),
ADD COLUMN "state" VARCHAR(100),
ADD COLUMN "pincode" VARCHAR(10);

-- AlterTable
ALTER TABLE "recycler_profiles"
ADD COLUMN "city" VARCHAR(100),
ADD COLUMN "district" VARCHAR(100),
ADD COLUMN "state" VARCHAR(100),
ADD COLUMN "pincode" VARCHAR(10);

-- AlterTable
ALTER TABLE "collection_requests"
ADD COLUMN "house_number" VARCHAR(100),
ADD COLUMN "street" VARCHAR(255),
ADD COLUMN "landmark" VARCHAR(255),
ADD COLUMN "city" VARCHAR(100),
ADD COLUMN "district" VARCHAR(100),
ADD COLUMN "state" VARCHAR(100),
ADD COLUMN "pincode" VARCHAR(10),
ADD COLUMN "location_accuracy" DECIMAL(6,2),
ADD COLUMN "address_type" "address_type" DEFAULT 'HOME';
