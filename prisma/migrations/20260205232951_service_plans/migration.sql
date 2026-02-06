/*
  Warnings:

  - A unique constraint covering the columns `[servicePlanId,scheduledStart]` on the table `Job` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ServicePlanStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "ServicePlanFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "servicePlanId" TEXT;

-- CreateTable
CREATE TABLE "ServicePlan" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "ServicePlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "frequency" "ServicePlanFrequency" NOT NULL,
    "clientId" TEXT NOT NULL,
    "addressId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "pricePerVisitCents" INTEGER,
    "lastGeneratedAt" TIMESTAMP(3),

    CONSTRAINT "ServicePlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServicePlan_clientId_idx" ON "ServicePlan"("clientId");

-- CreateIndex
CREATE INDEX "ServicePlan_status_idx" ON "ServicePlan"("status");

-- CreateIndex
CREATE INDEX "ServicePlan_frequency_idx" ON "ServicePlan"("frequency");

-- CreateIndex
CREATE INDEX "ServicePlan_startDate_idx" ON "ServicePlan"("startDate");

-- CreateIndex
CREATE INDEX "Job_servicePlanId_idx" ON "Job"("servicePlanId");

-- CreateIndex
CREATE UNIQUE INDEX "Job_servicePlanId_scheduledStart_key" ON "Job"("servicePlanId", "scheduledStart");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_servicePlanId_fkey" FOREIGN KEY ("servicePlanId") REFERENCES "ServicePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlan" ADD CONSTRAINT "ServicePlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePlan" ADD CONSTRAINT "ServicePlan_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "ClientAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
