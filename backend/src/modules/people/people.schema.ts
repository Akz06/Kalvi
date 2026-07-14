import { z } from "zod";

const gender = z.enum(["MALE", "FEMALE", "OTHER"], {
  errorMap: () => ({ message: "Gender must be Male, Female, or Other." }),
});

export const createStudentSchema = z.object({
  admissionNo: z.string().trim().min(1, "Admission number is required."),
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  gender,
  dob: z.coerce.date({
    errorMap: () => ({ message: "Date of birth must be a valid date." }),
  }),
  guardianName: z.string().trim().min(1, "Guardian name is required."),
  guardianPhone: z
    .string()
    .min(6, "Guardian phone must be at least 6 digits.")
    .max(15, "Guardian phone must be at most 15 digits."),
  address: z.string().optional(),
  sectionId: z.string().min(1, "Please select a class and section."),
});

export const updateStudentSchema = createStudentSchema.partial().extend({
  active: z.boolean().optional(),
});

export const createStaffSchema = z.object({
  employeeNo: z.string().trim().min(1, "Employee number is required."),
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  gender,
  email: z.string().email("Please enter a valid staff email address."),
  phone: z
    .string()
    .min(6, "Phone must be at least 6 digits.")
    .max(15, "Phone must be at most 15 digits."),
  designation: z.string().trim().min(1, "Designation is required."),
  subject: z.string().optional(),
  joiningDate: z.coerce
    .date({ errorMap: () => ({ message: "Joining date must be a valid date." }) })
    .optional(),
});

export const updateStaffSchema = createStaffSchema.partial().extend({
  active: z.boolean().optional(),
});
