-- CreateEnum
CREATE TYPE "MovementKind" AS ENUM ('MANUAL', 'INITIAL', 'ADJUSTMENT', 'ORDER', 'ORDER_CANCEL', 'ORDER_RESTORE', 'CUSTOMER_RETURN', 'SUPPLIER_IN', 'SUPPLIER_RETURN', 'REVISION');

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "kind" "MovementKind" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "orderId" TEXT;

-- CreateTable
CREATE TABLE "CustomerReturn" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerReturnItem" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "costPrice" DECIMAL(14,2),

    CONSTRAINT "CustomerReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerReturn_orderId_idx" ON "CustomerReturn"("orderId");

-- CreateIndex
CREATE INDEX "CustomerReturn_createdAt_idx" ON "CustomerReturn"("createdAt");

-- CreateIndex
CREATE INDEX "CustomerReturnItem_returnId_idx" ON "CustomerReturnItem"("returnId");

-- CreateIndex
CREATE INDEX "CustomerReturnItem_productId_idx" ON "CustomerReturnItem"("productId");

-- CreateIndex
CREATE INDEX "StockMovement_kind_idx" ON "StockMovement"("kind");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturn" ADD CONSTRAINT "CustomerReturn_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturn" ADD CONSTRAINT "CustomerReturn_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturn" ADD CONSTRAINT "CustomerReturn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturnItem" ADD CONSTRAINT "CustomerReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "CustomerReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReturnItem" ADD CONSTRAINT "CustomerReturnItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Mavjud harakatlarning turini avtomatik izohlardan aniqlash
UPDATE "StockMovement" SET "kind" = 'INITIAL', "note" = NULL
  WHERE "note" IN ('Boshlang''ich qoldiq', 'Boshlang''ich zaxira');
UPDATE "StockMovement" SET "kind" = 'ADJUSTMENT', "note" = NULL WHERE "note" = 'Qoldiq tuzatildi';
UPDATE "StockMovement" SET "kind" = 'ORDER_CANCEL', "note" = NULL WHERE "note" LIKE 'Buyurtma #% bekor qilindi';
UPDATE "StockMovement" SET "kind" = 'ORDER_RESTORE', "note" = NULL WHERE "note" LIKE 'Buyurtma #% qayta tiklandi';
UPDATE "StockMovement" SET "kind" = 'ORDER', "note" = NULL
  WHERE "kind" = 'MANUAL' AND ("note" LIKE 'Buyurtma #%' OR "note" LIKE 'Buyurtma %' OR "note" LIKE 'Order %');
UPDATE "StockMovement" SET "kind" = 'REVISION', "note" = NULLIF(substring("note" from 'Reviziya: (.*)'), '')
  WHERE "note" LIKE 'Reviziya%';
UPDATE "StockMovement" SET "kind" = 'SUPPLIER_IN' WHERE "supplierId" IS NOT NULL AND "type" = 'IN' AND "kind" IN ('MANUAL', 'INITIAL');
UPDATE "StockMovement" SET "kind" = 'SUPPLIER_RETURN' WHERE "supplierId" IS NOT NULL AND "type" = 'OUT';
UPDATE "StockMovement" SET "note" = NULL
  WHERE "kind" IN ('SUPPLIER_IN', 'SUPPLIER_RETURN') AND ("note" LIKE 'Kirim: %' OR "note" LIKE 'Qaytarildi: %');
-- Buyurtma harakatlarini buyurtmaga bog'lash (izohdagi qisqa raqam = id oxirgi 6 belgisi)
UPDATE "StockMovement" m SET "orderId" = o."id"
  FROM "Order" o
  WHERE m."kind" IN ('ORDER', 'ORDER_CANCEL', 'ORDER_RESTORE') AND m."orderId" IS NULL
    AND m."productId" IN (SELECT i."productId" FROM "OrderItem" i WHERE i."orderId" = o."id")
    AND abs(extract(epoch from (m."createdAt" - o."createdAt"))) < 5;
