import { z } from "zod";

export const slotsQuerySchema = z.object({
  clinicId: z.string().uuid(),
  serviceId: z.string().uuid(),
  dentistId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const createBookingSchema = z.object({
  clinicId: z.string().uuid(),
  serviceId: z.string().uuid(),
  dentistId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().optional(),
});
