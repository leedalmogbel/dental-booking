import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  clinicSlug: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const otpSendSchema = z.object({
  email: z.string().email(),
  clinicId: z.string().uuid(),
  clinicName: z.string().min(1),
  purpose: z.enum(["booking_verify", "login"]),
});

export const otpVerifySchema = z.object({
  email: z.string().email(),
  clinicId: z.string().uuid(),
  code: z.string().length(6),
  purpose: z.enum(["booking_verify", "login"]),
});
