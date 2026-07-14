import { z } from "zod";

export const createExamSchema = z.object({
  name: z.string().trim().min(1, "Exam name is required (e.g. 'Term 1 Maths')."),
  classId: z.string().min(1, "Please select a class."),
  subject: z.string().trim().min(1, "Subject is required."),
  maxMarks: z
    .number({ invalid_type_error: "Maximum marks must be a number." })
    .positive("Maximum marks must be greater than zero.")
    .optional(),
  examDate: z.coerce.date({
    errorMap: () => ({ message: "Exam date must be a valid date." }),
  }),
});

export const recordResultsSchema = z.object({
  maxMarks: z.number().positive().optional(),
  results: z
    .array(
      z.object({
        studentId: z.string().min(1, "Each result must reference a student."),
        marksObtained: z
          .number({ invalid_type_error: "Marks must be a number." })
          .min(0, "Marks cannot be negative."),
        remark: z.string().optional(),
      })
    )
    .min(1, "Please enter marks for at least one student."),
});
