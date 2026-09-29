-- CreateEnum
CREATE TYPE "CashType" AS ENUM ('IN', 'OUT', 'TRANSFER');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "nameRu" TEXT;

-- AlterTable
ALTER TABLE "CustomerReturn" ADD COLUMN     "refundMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "method" "PaymentMethod" NOT NULL DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "closingCash" DECIMAL(14,2),
ADD COLUMN     "expectedCash" DECIMAL(14,2),
ADD COLUMN     "openingCash" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "CashTransaction" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "type" "CashType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "toMethod" "PaymentMethod",
    "category" TEXT,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashTransaction_number_key" ON "CashTransaction"("number");

-- CreateIndex
CREATE INDEX "CashTransaction_createdAt_idx" ON "CashTransaction"("createdAt");

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

