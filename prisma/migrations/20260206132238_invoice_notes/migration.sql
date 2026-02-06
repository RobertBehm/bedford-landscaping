/*
  Warnings:

  - You are about to drop the column `notes` on the `Invoice` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "InvoiceNoteChannel" AS ENUM ('CALL', 'TEXT', 'EMAIL', 'IN_PERSON', 'OTHER');

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "notes";

-- CreateTable
CREATE TABLE "InvoiceNote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceId" TEXT NOT NULL,
    "channel" "InvoiceNoteChannel" NOT NULL,
    "body" TEXT NOT NULL,
    "createdByUserId" TEXT,

    CONSTRAINT "InvoiceNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceNote_invoiceId_idx" ON "InvoiceNote"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceNote_createdAt_idx" ON "InvoiceNote"("createdAt");

-- CreateIndex
CREATE INDEX "InvoiceNote_channel_idx" ON "InvoiceNote"("channel");

-- AddForeignKey
ALTER TABLE "InvoiceNote" ADD CONSTRAINT "InvoiceNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
