/*
  Warnings:

  - You are about to drop the column `photos` on the `delivery_assignments` table. All the data in the column will be lost.
  - You are about to drop the column `lastFailedAt` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `retryLockedUntil` on the `payments` table. All the data in the column will be lost.
  - The `refundStatus` column on the `payments` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'COMPLETED');

-- AlterTable
ALTER TABLE "delivery_assignments" DROP COLUMN "photos",
ADD COLUMN     "afterPhoto" TEXT,
ADD COLUMN     "beforePhoto" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "lastFailedAt",
DROP COLUMN "retryLockedUntil",
DROP COLUMN "refundStatus",
ADD COLUMN     "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NOT_REQUIRED';
