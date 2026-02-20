/*
  Warnings:

  - You are about to drop the column `questionId` on the `FormAnswer` table. All the data in the column will be lost.
  - You are about to drop the column `options` on the `FormQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `FormQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `FormQuestion` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[submissionId,formQuestionId]` on the table `FormAnswer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[formId,questionId]` on the table `FormQuestion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `formQuestionId` to the `FormAnswer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `questionId` to the `FormQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');

-- DropForeignKey
ALTER TABLE "FormAnswer" DROP CONSTRAINT "FormAnswer_questionId_fkey";

-- DropIndex
DROP INDEX "FormAnswer_submissionId_questionId_key";

-- AlterTable
ALTER TABLE "FormAnswer" DROP COLUMN "questionId",
ADD COLUMN     "formQuestionId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "FormQuestion" DROP COLUMN "options",
DROP COLUMN "title",
DROP COLUMN "type",
ADD COLUMN     "questionId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'TEACHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "options" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FormAnswer_submissionId_formQuestionId_key" ON "FormAnswer"("submissionId", "formQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "FormQuestion_formId_questionId_key" ON "FormQuestion"("formId", "questionId");

-- AddForeignKey
ALTER TABLE "FormQuestion" ADD CONSTRAINT "FormQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormAnswer" ADD CONSTRAINT "FormAnswer_formQuestionId_fkey" FOREIGN KEY ("formQuestionId") REFERENCES "FormQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
