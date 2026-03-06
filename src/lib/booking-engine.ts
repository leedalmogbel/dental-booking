import { db } from "@/db";
import { clinics, dentists, services, appointments, dentistServices, users } from "@/db/schema";
import { eq, and, not, inArray } from "drizzle-orm";

interface TimeSlot {
  start: string;
  end: string;
}

interface DentistAvailability {
  dentistId: string;
  dentistName: string;
  slots: TimeSlot[];
}

const DAY_MAP: Record<number, string> = {
  0: "sun", 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat",
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function slotsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

export async function generateAvailableSlots(
  clinicId: string,
  serviceId: string,
  date: string,
  dentistId?: string
): Promise<{ dentists: DentistAvailability[]; earliestSlot: { dentistId: string; time: string } | null }> {
  const dateObj = new Date(date + "T00:00:00");
  const dayOfWeek = DAY_MAP[dateObj.getDay()];

  // 1. Get clinic
  const [clinic] = await db.select().from(clinics).where(eq(clinics.id, clinicId)).limit(1);
  if (!clinic?.operatingHours) return { dentists: [], earliestSlot: null };

  const clinicHours = (clinic.operatingHours as Record<string, { start: string; end: string }>)[dayOfWeek];
  if (!clinicHours) return { dentists: [], earliestSlot: null };

  // 2. Get service
  const [service] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
  if (!service) return { dentists: [], earliestSlot: null };
  const duration = service.durationMinutes;

  // 3. Get eligible dentists
  let eligibleDentistIds: string[] = [];
  if (dentistId) {
    eligibleDentistIds = [dentistId];
  } else {
    const links = await db
      .select({ dentistId: dentistServices.dentistId })
      .from(dentistServices)
      .where(eq(dentistServices.serviceId, serviceId));
    eligibleDentistIds = links.map((l) => l.dentistId);
  }

  if (eligibleDentistIds.length === 0) return { dentists: [], earliestSlot: null };

  // 4. Get dentist details
  const dentistList = await db
    .select({
      id: dentists.id,
      workingHours: dentists.workingHours,
      workingDays: dentists.workingDays,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(dentists)
    .innerJoin(users, eq(dentists.userId, users.id))
    .where(and(eq(dentists.isActive, true), inArray(dentists.id, eligibleDentistIds)));

  // 5. Get existing appointments
  const existingAppts = await db
    .select({ dentistId: appointments.dentistId, startTime: appointments.startTime, endTime: appointments.endTime })
    .from(appointments)
    .where(
      and(
        eq(appointments.clinicId, clinicId),
        eq(appointments.date, date),
        not(eq(appointments.status, "cancelled"))
      )
    );

  const result: DentistAvailability[] = [];
  let earliestSlot: { dentistId: string; time: string } | null = null;

  for (const dentist of dentistList) {
    const workingDays = dentist.workingDays as string[] | null;
    if (!workingDays?.includes(dayOfWeek)) continue;

    const workingHours = dentist.workingHours as Record<string, { start: string; end: string; breakStart?: string; breakEnd?: string }> | null;
    const dentistHours = workingHours?.[dayOfWeek];
    if (!dentistHours) continue;

    const windowStart = Math.max(timeToMinutes(clinicHours.start), timeToMinutes(dentistHours.start));
    const windowEnd = Math.min(timeToMinutes(clinicHours.end), timeToMinutes(dentistHours.end));

    const breakStart = dentistHours.breakStart ? timeToMinutes(dentistHours.breakStart) : null;
    const breakEnd = dentistHours.breakEnd ? timeToMinutes(dentistHours.breakEnd) : null;

    const dentistAppts = existingAppts
      .filter((a) => a.dentistId === dentist.id)
      .map((a) => ({ start: timeToMinutes(a.startTime), end: timeToMinutes(a.endTime) }));

    const slots: TimeSlot[] = [];
    for (let slotStart = windowStart; slotStart + duration <= windowEnd; slotStart += 30) {
      const slotEnd = slotStart + duration;

      if (breakStart !== null && breakEnd !== null && slotsOverlap(slotStart, slotEnd, breakStart, breakEnd)) continue;

      const hasConflict = dentistAppts.some((a) => slotsOverlap(slotStart, slotEnd, a.start, a.end));
      if (hasConflict) continue;

      slots.push({ start: minutesToTime(slotStart), end: minutesToTime(slotEnd) });
    }

    if (slots.length > 0) {
      result.push({
        dentistId: dentist.id,
        dentistName: `Dr. ${dentist.firstName} ${dentist.lastName}`,
        slots,
      });

      if (!earliestSlot || timeToMinutes(slots[0].start) < timeToMinutes(earliestSlot.time)) {
        earliestSlot = { dentistId: dentist.id, time: slots[0].start };
      }
    }
  }

  return { dentists: result, earliestSlot };
}
