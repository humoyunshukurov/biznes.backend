-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "kind" TEXT;

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "counts" JSONB,
ADD COLUMN     "number" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Shift_number_key" ON "Shift"("number");

