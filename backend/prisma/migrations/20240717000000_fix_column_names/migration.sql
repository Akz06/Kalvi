-- Fix column name mismatches between initial migration and Prisma schema
-- 1. Exam: "date" → "examDate"
-- 2. ExamResult: "remarks" → "remark", "marksObtained" float fix
-- 3. Guardian: "relation" → "relationship"

-- Exam table: rename "date" to "examDate"
ALTER TABLE "Exam" RENAME COLUMN "date" TO "examDate";

-- Exam table: add missing "updatedAt" if it doesn't exist (schema has it, init didn't)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Exam' AND column_name = 'updatedAt'
  ) THEN
    ALTER TABLE "Exam" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- ExamResult table: rename "remarks" to "remark"
ALTER TABLE "ExamResult" RENAME COLUMN "remarks" TO "remark";

-- ExamResult: fix marksObtained type (init had INTEGER, schema has Float)
ALTER TABLE "ExamResult" ALTER COLUMN "marksObtained" TYPE DOUBLE PRECISION;

-- Guardian table: rename "relation" to "relationship"
ALTER TABLE "Guardian" RENAME COLUMN "relation" TO "relationship";

-- Exam: update the drop index / recreate for renamed column (index names don't change)
-- No index on "date" directly existed (only schoolId and classId indexes) so no action needed.
