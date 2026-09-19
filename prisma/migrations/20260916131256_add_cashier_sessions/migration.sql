-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('DINE_IN', 'TAKEAWAY', 'DELIVERY');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "discount_reason" VARCHAR(255),
ADD COLUMN     "order_type" "OrderType" NOT NULL DEFAULT 'DINE_IN';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "is_refund" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "cashier_sessions" (
    "id" UUID NOT NULL,
    "opened_by_id" UUID NOT NULL,
    "closed_by_id" UUID,
    "opened_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(3),
    "opening_balance" DECIMAL(12,2) NOT NULL,
    "counted_balance" DECIMAL(12,2),
    "expected_balance" DECIMAL(12,2),
    "difference" DECIMAL(12,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "cashier_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id" UUID,
    "payload" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "cashier_sessions" ADD CONSTRAINT "cashier_sessions_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_sessions" ADD CONSTRAINT "cashier_sessions_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
