import "dotenv/config";
import { Worker, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { sendEmail } from "./lib/email";
import { appointmentReminderEmail } from "./lib/email-templates";
import { db } from "./db";
import { appointments, services, dentists, users, clinics } from "./db/schema";
import { eq } from "drizzle-orm";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
}) as unknown as ConnectionOptions;

// Email worker — sends emails directly
const emailWorker = new Worker(
  "email",
  async (job) => {
    const { to, subject, html } = job.data;
    await sendEmail(to, subject, html);
    console.log(`Email sent to ${to}: ${subject}`);
  },
  { connection }
);

// Reminder worker — fetches appointment data and sends reminder
const reminderWorker = new Worker(
  "reminder",
  async (job) => {
    const { appointmentId } = job.data;

    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (!appointment || appointment.status === "cancelled") return;

    const [service] = await db
      .select()
      .from(services)
      .where(eq(services.id, appointment.serviceId))
      .limit(1);

    const [dentist] = await db
      .select()
      .from(dentists)
      .where(eq(dentists.id, appointment.dentistId))
      .limit(1);

    const [dentistUser] = dentist
      ? await db
          .select()
          .from(users)
          .where(eq(users.id, dentist.userId))
          .limit(1)
      : [null];

    const [patient] = await db
      .select()
      .from(users)
      .where(eq(users.id, appointment.patientId))
      .limit(1);

    const [clinic] = await db
      .select()
      .from(clinics)
      .where(eq(clinics.id, appointment.clinicId))
      .limit(1);

    if (!patient || !clinic || !service) return;

    const apptDateTime = new Date(`${appointment.date}T${appointment.startTime}:00`);
    const hoursUntil = Math.round(
      (apptDateTime.getTime() - Date.now()) / (1000 * 60 * 60)
    );

    const { subject, html } = appointmentReminderEmail({
      clinicName: clinic.name,
      patientName: `${patient.firstName} ${patient.lastName}`,
      serviceName: service.name,
      dentistName: dentistUser
        ? `Dr. ${dentistUser.firstName} ${dentistUser.lastName}`
        : "Your dentist",
      date: appointment.date,
      time: appointment.startTime,
      clinicAddress: clinic.address || "",
      hoursUntil,
    });

    await sendEmail(patient.email, subject, html);
    console.log(`Reminder sent to ${patient.email} for appointment ${appointmentId}`);
  },
  { connection }
);

emailWorker.on("failed", (job, err) =>
  console.error(`Email job ${job?.id} failed:`, err)
);
reminderWorker.on("failed", (job, err) =>
  console.error(`Reminder job ${job?.id} failed:`, err)
);

console.log("Workers started - listening for email and reminder jobs");
