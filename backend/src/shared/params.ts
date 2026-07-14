import { z } from "zod";

/** Shared route-param schema for endpoints that take a record id. */
export const idParam = z.object({
  id: z.string().min(1, "A valid record id is required."),
});
