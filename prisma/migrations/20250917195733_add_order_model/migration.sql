-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "financialStatus" TEXT,
    "fulfillmentStatus" TEXT,
    "totalPrice" REAL NOT NULL DEFAULT 0,
    "subtotalPrice" REAL NOT NULL DEFAULT 0,
    "totalTax" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "orderDate" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerData" TEXT,
    "billingAddress" TEXT,
    "shippingAddress" TEXT,
    "lineItems" TEXT NOT NULL,
    "taxLines" TEXT NOT NULL,
    "discountApplications" TEXT NOT NULL,
    "shippingLines" TEXT NOT NULL,
    "noteAttributes" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "note" TEXT,
    "gateway" TEXT,
    "sourceIdentifier" TEXT,
    "sourceUrl" TEXT,
    "deviceId" TEXT,
    "browserIp" TEXT,
    "landingSite" TEXT,
    "referringSite" TEXT
);

-- CreateIndex
CREATE INDEX "Order_shop_orderDate_idx" ON "Order"("shop", "orderDate");

-- CreateIndex
CREATE INDEX "Order_shop_financialStatus_idx" ON "Order"("shop", "financialStatus");

-- CreateIndex
CREATE INDEX "Order_shop_fulfillmentStatus_idx" ON "Order"("shop", "fulfillmentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Order_shop_shopifyOrderId_key" ON "Order"("shop", "shopifyOrderId");
