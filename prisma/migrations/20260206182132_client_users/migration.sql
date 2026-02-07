-- CreateEnum
CREATE TYPE "ClientUserRole" AS ENUM ('OWNER', 'MEMBER');

-- CreateTable
CREATE TABLE "ClientUser" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clerkUserId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "role" "ClientUserRole" NOT NULL DEFAULT 'OWNER',

    CONSTRAINT "ClientUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientUser_clerkUserId_key" ON "ClientUser"("clerkUserId");

-- CreateIndex
CREATE INDEX "ClientUser_clientId_idx" ON "ClientUser"("clientId");

-- AddForeignKey
ALTER TABLE "ClientUser" ADD CONSTRAINT "ClientUser_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
