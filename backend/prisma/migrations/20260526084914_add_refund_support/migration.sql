-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "refundCompletedAt" TIMESTAMP(3),
ADD COLUMN     "refundInitiatedAt" TIMESTAMP(3),
ADD COLUMN     "refundStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED';
