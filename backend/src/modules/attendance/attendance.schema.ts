import { z } from "zod";

export const markAttendanceSchema = z.object({
  date: z.coerce.date({
    errorMap: () => ({ message: "Attendance date must be a valid date." }),
  }),
  sectionId: z.string().min(1, "Please select a section."),
  records: z
    .array(
      z.object({
        studentId: z.string().min(1, "Each record must reference a student."),
        status: z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE"], {
          errorMap: () => ({
            message: "Attendance status must be Present, Absent, Late, or Leave.",
          }),
        }),
        remark: z.string().optional(),
      })
    )
    .min(1, "Please mark attendance for at least one student."),
});
