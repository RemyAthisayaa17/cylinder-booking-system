/*
  Warnings:

  - Changed the type of `region` on the `pricing` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "pricing" DROP COLUMN "region",
ADD COLUMN     "region" "AreaType" NOT NULL;
