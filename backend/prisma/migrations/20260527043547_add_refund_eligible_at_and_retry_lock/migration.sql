-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "lastFailedAt" TIMESTAMP(3),
ADD COLUMN     "refundEligibleAt" TIMESTAMP(3),
ADD COLUMN     "retryLockedUntil" TIMESTAMP(3);
