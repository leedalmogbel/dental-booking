import { Queue, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
}) as unknown as ConnectionOptions;

export const emailQueue = new Queue("email", { connection });
export const reminderQueue = new Queue("reminder", { connection });

export async function scheduleReminder(appointmentId: string, scheduledFor: Date) {
  const delay = scheduledFor.getTime() - Date.now();
  if (delay <= 0) return;

  await reminderQueue.add(
    "send-reminder",
    { appointmentId },
    { delay, jobId: `reminder-${appointmentId}-${delay}` }
  );
}

export async function scheduleAppointmentReminders(
  appointmentId: string,
  appointmentDate: string,
  appointmentTime: string
) {
  const dateTime = new Date(`${appointmentDate}T${appointmentTime}:00`);

  // 24 hours before
  const reminder24h = new Date(dateTime.getTime() - 24 * 60 * 60 * 1000);
  await scheduleReminder(appointmentId, reminder24h);

  // 2 hours before
  const reminder2h = new Date(dateTime.getTime() - 2 * 60 * 60 * 1000);
  await scheduleReminder(appointmentId, reminder2h);
}
