-- AlterEnum
ALTER TYPE "DeliveryStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "delivery_assignments" ALTER COLUMN "partnerId" DROP NOT NULL;
