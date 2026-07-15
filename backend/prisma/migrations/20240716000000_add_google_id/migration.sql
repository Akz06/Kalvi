-- Add googleId column to User for Google OAuth sign-in
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
CREATE INDEX IF NOT EXISTS "User_googleId_idx" ON "User"("googleId");
