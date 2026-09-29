-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "note" TEXT;

