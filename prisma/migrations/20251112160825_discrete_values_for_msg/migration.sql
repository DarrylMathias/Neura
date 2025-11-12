/*
  Warnings:

  - Added the required column `role` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Conversation_userId_key";

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "agentName" TEXT,
ADD COLUMN     "content" TEXT,
ADD COLUMN     "file" TEXT,
ADD COLUMN     "reasoning" TEXT,
ADD COLUMN     "role" "Role" NOT NULL,
ADD COLUMN     "sourceURL" TEXT,
ADD COLUMN     "toolUsed" TEXT;

-- CreateIndex
CREATE INDEX "Message_toolUsed_idx" ON "Message"("toolUsed");

-- CreateIndex
CREATE INDEX "Message_agentName_idx" ON "Message"("agentName");
