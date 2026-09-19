-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "portion" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- CreateTable
CREATE TABLE "sync_history" (
    "id" UUID NOT NULL,
    "synced_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_history_pkey" PRIMARY KEY ("id")
);
