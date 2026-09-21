-- CreateEnum
CREATE TYPE "material_category" AS ENUM (
  'CRT', 'LCD_PANEL', 'PCB', 'CABLE', 'BATTERY', 'MOTOR',
  'MAGNET_ASSEMBLY', 'MIXED_PLASTIC', 'MOBILE_PHONE', 'LAPTOP',
  'MONITOR', 'PRINTER', 'KEYBOARD_MOUSE', 'DESKTOP_COMPUTER',
  'TABLET', 'OTHER'
);

-- CreateEnum
CREATE TYPE "material_source_type" AS ENUM (
  'HOUSEHOLD', 'COMMERCIAL', 'INDUSTRIAL', 'STREET', 'OTHER'
);

-- CreateEnum
CREATE TYPE "material_lot_status" AS ENUM (
  'DRAFT', 'OPEN', 'QUOTED', 'ACCEPTED', 'HANDOVER_PENDING', 'COMPLETED'
);

-- CreateTable
CREATE TABLE "material_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reference_id" VARCHAR(50) NOT NULL,
    "collector_id" UUID NOT NULL,
    "category" "material_category" NOT NULL,
    "subcategory" VARCHAR(100),
    "description" TEXT,
    "approximate_weight_kg" DECIMAL(8,2),
    "condition" "item_condition" NOT NULL DEFAULT 'UNKNOWN',
    "source_type" "material_source_type" NOT NULL DEFAULT 'HOUSEHOLD',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_lots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reference_number" VARCHAR(50) NOT NULL,
    "client_reference_id" VARCHAR(100),
    "collector_id" UUID NOT NULL,
    "status" "material_lot_status" NOT NULL DEFAULT 'DRAFT',
    "category" "material_category" NOT NULL,
    "subcategory" VARCHAR(100),
    "description" TEXT,
    "approximate_total_weight_kg" DECIMAL(8,2),
    "condition" "item_condition" NOT NULL DEFAULT 'UNKNOWN',
    "source_type" "material_source_type" NOT NULL DEFAULT 'HOUSEHOLD',
    "collection_lat" DECIMAL(10,7),
    "collection_lng" DECIMAL(10,7),
    "collection_accuracy" DECIMAL(6,2),
    "collection_timestamp" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_lot_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lot_id" UUID NOT NULL,
    "material_item_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_lot_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_lot_photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lot_id" UUID NOT NULL,
    "photo_url" VARCHAR(500) NOT NULL,
    "storage_path" VARCHAR(255),
    "file_size" INTEGER,
    "mime_type" VARCHAR(50),
    "captured_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_lot_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "material_items_reference_id_key" ON "material_items"("reference_id");
CREATE INDEX "idx_mi_collector" ON "material_items"("collector_id");
CREATE INDEX "idx_mi_category" ON "material_items"("category");

CREATE UNIQUE INDEX "material_lots_reference_number_key" ON "material_lots"("reference_number");
CREATE UNIQUE INDEX "material_lots_client_reference_id_key" ON "material_lots"("client_reference_id");
CREATE INDEX "idx_ml_collector" ON "material_lots"("collector_id");
CREATE INDEX "idx_ml_status" ON "material_lots"("status");
CREATE INDEX "idx_ml_category" ON "material_lots"("category");
CREATE INDEX "idx_ml_created" ON "material_lots"("created_at");

CREATE UNIQUE INDEX "material_lot_items_lot_id_material_item_id_key" ON "material_lot_items"("lot_id", "material_item_id");
CREATE INDEX "idx_mli_lot" ON "material_lot_items"("lot_id");
CREATE INDEX "idx_mli_item" ON "material_lot_items"("material_item_id");

CREATE INDEX "idx_mlp_lot" ON "material_lot_photos"("lot_id");

-- Foreign Keys
ALTER TABLE "material_items" ADD CONSTRAINT "material_items_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "collector_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_lots" ADD CONSTRAINT "material_lots_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "collector_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_lot_items" ADD CONSTRAINT "material_lot_items_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "material_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "material_lot_items" ADD CONSTRAINT "material_lot_items_material_item_id_fkey" FOREIGN KEY ("material_item_id") REFERENCES "material_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "material_lot_photos" ADD CONSTRAINT "material_lot_photos_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "material_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
