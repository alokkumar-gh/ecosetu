-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('CITIZEN', 'INFORMAL_COLLECTOR', 'RECYCLER', 'ADMIN');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "ewaste_category" AS ENUM ('MOBILE_PHONE', 'LAPTOP', 'DESKTOP', 'TABLET', 'MONITOR', 'PRINTER', 'KEYBOARD_MOUSE', 'CABLE_CHARGER', 'BATTERY', 'CIRCUIT_BOARD', 'OTHER');

-- CreateEnum
CREATE TYPE "item_condition" AS ENUM ('WORKING', 'NOT_WORKING', 'DAMAGED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "item_status" AS ENUM ('SUBMITTED', 'COLLECTED', 'CONSIGNED', 'RECYCLED');

-- CreateEnum
CREATE TYPE "request_status" AS ENUM ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "pickup_status" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "consignment_status" AS ENUM ('CREATED', 'IN_TRANSIT', 'DELIVERED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "recycling_status" AS ENUM ('RECEIVED', 'PROCESSING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "verification_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(15),
    "role" "user_role" NOT NULL,
    "status" "user_status" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "avatar_url" VARCHAR(500),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collector_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "service_area_lat" DECIMAL(10,7),
    "service_area_lng" DECIMAL(10,7),
    "service_radius_km" DECIMAL(5,2) DEFAULT 5.00,
    "id_document_url" VARCHAR(500),
    "bio" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "total_pickups" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collector_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recycler_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "facility_name" VARCHAR(200) NOT NULL,
    "facility_address" TEXT NOT NULL,
    "facility_lat" DECIMAL(10,7),
    "facility_lng" DECIMAL(10,7),
    "license_number" VARCHAR(100),
    "license_document_url" VARCHAR(500),
    "accepted_categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "total_consignments" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recycler_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ewaste_items" (
    "id" UUID NOT NULL,
    "collection_request_id" UUID,
    "citizen_id" UUID NOT NULL,
    "category" "ewaste_category" NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "condition" "item_condition" NOT NULL DEFAULT 'UNKNOWN',
    "estimated_weight_kg" DECIMAL(8,2),
    "actual_weight_kg" DECIMAL(8,2),
    "image_url" VARCHAR(500),
    "status" "item_status" NOT NULL DEFAULT 'SUBMITTED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ewaste_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_requests" (
    "id" UUID NOT NULL,
    "citizen_id" UUID NOT NULL,
    "status" "request_status" NOT NULL DEFAULT 'DRAFT',
    "pickup_address" TEXT NOT NULL,
    "pickup_lat" DECIMAL(10,7) NOT NULL,
    "pickup_lng" DECIMAL(10,7) NOT NULL,
    "preferred_date" DATE,
    "preferred_time_start" TIME,
    "preferred_time_end" TIME,
    "notes" TEXT,
    "collector_id" UUID,
    "submitted_at" TIMESTAMPTZ(6),
    "accepted_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pickups" (
    "id" UUID NOT NULL,
    "collection_request_id" UUID NOT NULL,
    "collector_id" UUID NOT NULL,
    "status" "pickup_status" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_date" DATE,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "total_weight_kg" DECIMAL(8,2),
    "pickup_photo_url" VARCHAR(500),
    "collector_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pickups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consignments" (
    "id" UUID NOT NULL,
    "collector_id" UUID NOT NULL,
    "recycler_id" UUID NOT NULL,
    "status" "consignment_status" NOT NULL DEFAULT 'CREATED',
    "total_weight_kg" DECIMAL(8,2),
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "delivery_notes" TEXT,
    "delivered_at" TIMESTAMPTZ(6),
    "accepted_at" TIMESTAMPTZ(6),
    "rejected_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consignment_items" (
    "id" UUID NOT NULL,
    "consignment_id" UUID NOT NULL,
    "ewaste_item_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consignment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recycling_records" (
    "id" UUID NOT NULL,
    "consignment_id" UUID NOT NULL,
    "recycler_id" UUID NOT NULL,
    "status" "recycling_status" NOT NULL DEFAULT 'RECEIVED',
    "processing_notes" TEXT,
    "output_description" TEXT,
    "output_weight_kg" DECIMAL(8,2),
    "completion_certificate_url" VARCHAR(500),
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processing_started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recycling_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_predictions" (
    "id" UUID NOT NULL,
    "ewaste_item_id" UUID NOT NULL,
    "image_url" VARCHAR(500) NOT NULL,
    "predicted_category" "ewaste_category" NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "all_predictions" JSONB,
    "model_version" VARCHAR(50) NOT NULL,
    "was_accepted" BOOLEAN,
    "user_corrected_category" "ewaste_category",
    "inference_time_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "verification_status" NOT NULL DEFAULT 'PENDING',
    "document_url" VARCHAR(500),
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by" UUID,
    "review_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "reference_type" VARCHAR(50),
    "reference_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "details" JSONB,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "platform" VARCHAR(20) NOT NULL DEFAULT 'android',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_users_status" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "collector_profiles_user_id_key" ON "collector_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_cp_available" ON "collector_profiles"("is_available");

-- CreateIndex
CREATE INDEX "idx_cp_location" ON "collector_profiles"("service_area_lat", "service_area_lng");

-- CreateIndex
CREATE UNIQUE INDEX "recycler_profiles_user_id_key" ON "recycler_profiles"("user_id");

-- CreateIndex
CREATE INDEX "idx_rp_location" ON "recycler_profiles"("facility_lat", "facility_lng");

-- CreateIndex
CREATE INDEX "idx_ei_request" ON "ewaste_items"("collection_request_id");

-- CreateIndex
CREATE INDEX "idx_ei_citizen" ON "ewaste_items"("citizen_id");

-- CreateIndex
CREATE INDEX "idx_ei_category" ON "ewaste_items"("category");

-- CreateIndex
CREATE INDEX "idx_ei_status" ON "ewaste_items"("status");

-- CreateIndex
CREATE INDEX "idx_cr_citizen" ON "collection_requests"("citizen_id");

-- CreateIndex
CREATE INDEX "idx_cr_status" ON "collection_requests"("status");

-- CreateIndex
CREATE INDEX "idx_cr_collector" ON "collection_requests"("collector_id");

-- CreateIndex
CREATE INDEX "idx_cr_location" ON "collection_requests"("pickup_lat", "pickup_lng");

-- CreateIndex
CREATE UNIQUE INDEX "pickups_collection_request_id_key" ON "pickups"("collection_request_id");

-- CreateIndex
CREATE INDEX "idx_p_collector" ON "pickups"("collector_id");

-- CreateIndex
CREATE INDEX "idx_p_status" ON "pickups"("status");

-- CreateIndex
CREATE INDEX "idx_con_collector" ON "consignments"("collector_id");

-- CreateIndex
CREATE INDEX "idx_con_recycler" ON "consignments"("recycler_id");

-- CreateIndex
CREATE INDEX "idx_con_status" ON "consignments"("status");

-- CreateIndex
CREATE INDEX "idx_ci_consignment" ON "consignment_items"("consignment_id");

-- CreateIndex
CREATE INDEX "idx_ci_item" ON "consignment_items"("ewaste_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "consignment_items_consignment_id_ewaste_item_id_key" ON "consignment_items"("consignment_id", "ewaste_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "recycling_records_consignment_id_key" ON "recycling_records"("consignment_id");

-- CreateIndex
CREATE INDEX "idx_rr_recycler" ON "recycling_records"("recycler_id");

-- CreateIndex
CREATE INDEX "idx_rr_status" ON "recycling_records"("status");

-- CreateIndex
CREATE INDEX "idx_ap_item" ON "ai_predictions"("ewaste_item_id");

-- CreateIndex
CREATE INDEX "idx_ap_accepted" ON "ai_predictions"("was_accepted");

-- CreateIndex
CREATE INDEX "idx_v_user" ON "verifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_v_status" ON "verifications"("status");

-- CreateIndex
CREATE INDEX "idx_n_user" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_n_read" ON "notifications"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "idx_n_created" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "idx_al_actor" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "idx_al_action" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "idx_al_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_al_created" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_dt_user" ON "device_tokens"("user_id");

-- CreateIndex
CREATE INDEX "idx_dt_active" ON "device_tokens"("user_id", "is_active");

-- AddForeignKey
ALTER TABLE "collector_profiles" ADD CONSTRAINT "collector_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recycler_profiles" ADD CONSTRAINT "recycler_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ewaste_items" ADD CONSTRAINT "ewaste_items_collection_request_id_fkey" FOREIGN KEY ("collection_request_id") REFERENCES "collection_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ewaste_items" ADD CONSTRAINT "ewaste_items_citizen_id_fkey" FOREIGN KEY ("citizen_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_requests" ADD CONSTRAINT "collection_requests_citizen_id_fkey" FOREIGN KEY ("citizen_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_requests" ADD CONSTRAINT "collection_requests_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "collector_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_collection_request_id_fkey" FOREIGN KEY ("collection_request_id") REFERENCES "collection_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pickups" ADD CONSTRAINT "pickups_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "collector_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consignments" ADD CONSTRAINT "consignments_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "collector_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consignments" ADD CONSTRAINT "consignments_recycler_id_fkey" FOREIGN KEY ("recycler_id") REFERENCES "recycler_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consignment_items" ADD CONSTRAINT "consignment_items_consignment_id_fkey" FOREIGN KEY ("consignment_id") REFERENCES "consignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consignment_items" ADD CONSTRAINT "consignment_items_ewaste_item_id_fkey" FOREIGN KEY ("ewaste_item_id") REFERENCES "ewaste_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recycling_records" ADD CONSTRAINT "recycling_records_consignment_id_fkey" FOREIGN KEY ("consignment_id") REFERENCES "consignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recycling_records" ADD CONSTRAINT "recycling_records_recycler_id_fkey" FOREIGN KEY ("recycler_id") REFERENCES "recycler_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_predictions" ADD CONSTRAINT "ai_predictions_ewaste_item_id_fkey" FOREIGN KEY ("ewaste_item_id") REFERENCES "ewaste_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

