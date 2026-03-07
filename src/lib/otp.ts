import { db } from "@/db";
import { otpCodes } from "@/db/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { otpEmail } from "@/lib/email-templates";

const OTP_EXPIRY_MINUTES = 5;
const OTP_RATE_LIMIT = 5; // per hour per email

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtp(
  email: string,
  clinicId: string,
  clinicName: string,
  purpose: "booking_verify" | "login"
): Promise<{ success: boolean; error?: string }> {
  // Rate limit: count OTPs sent in last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.email, email.toLowerCase()),
        eq(otpCodes.clinicId, clinicId),
        gt(otpCodes.createdAt, oneHourAgo)
      )
    );

  if (count >= OTP_RATE_LIMIT) {
    return { success: false, error: "Too many OTP requests. Please try again later." };
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await db.insert(otpCodes).values({
    email: email.toLowerCase(),
    clinicId,
    code,
    purpose,
    expiresAt,
  });

  const { subject, html } = otpEmail({ clinicName, code, purpose });

  try {
    await sendEmail(email, subject, html);
  } catch (err) {
    console.error("[OTP] Failed to send email:", err);
    return { success: false, error: "Failed to send verification email. Please try again." };
  }

  return { success: true };
}

export async function verifyOtp(
  email: string,
  clinicId: string,
  code: string,
  purpose: "booking_verify" | "login"
): Promise<boolean> {
  const [otp] = await db
    .select()
    .from(otpCodes)
    .where(
      and(
        eq(otpCodes.email, email.toLowerCase()),
        eq(otpCodes.clinicId, clinicId),
        eq(otpCodes.code, code),
        eq(otpCodes.purpose, purpose),
        isNull(otpCodes.usedAt),
        gt(otpCodes.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!otp) return false;

  await db
    .update(otpCodes)
    .set({ usedAt: new Date() })
    .where(eq(otpCodes.id, otp.id));

  return true;
}
