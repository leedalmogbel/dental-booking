function baseLayout(clinicName: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${clinicName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f7;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#2563EB;padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">${clinicName}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:13px;color:#6b7280;">This email was sent by ${clinicName} via DentalBook.</p>
              <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Please do not reply directly to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;font-size:14px;color:#6b7280;white-space:nowrap;vertical-align:top;">${label}</td>
    <td style="padding:8px 12px;font-size:14px;color:#111827;font-weight:500;">${value}</td>
  </tr>`;
}

function detailsTable(rows: [string, string][]): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f9fafb;border-radius:6px;margin:16px 0;">
    ${rows.map(([label, value]) => detailRow(label, value)).join("")}
  </table>`;
}

// ---------------------------------------------------------------------------
// Booking Confirmation
// ---------------------------------------------------------------------------
export function bookingConfirmationEmail(data: {
  clinicName: string;
  patientName: string;
  serviceName: string;
  dentistName: string;
  date: string;
  time: string;
  amount: string;
  clinicAddress: string;
  clinicPhone: string;
}): { subject: string; html: string } {
  const subject = `Booking Confirmed — ${data.clinicName}`;

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Booking Confirmed</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">Hi ${data.patientName}, your appointment has been booked successfully.</p>

    ${detailsTable([
      ["Service", data.serviceName],
      ["Dentist", data.dentistName],
      ["Date", data.date],
      ["Time", data.time],
      ["Amount", data.amount],
      ["Location", data.clinicAddress],
      ["Phone", data.clinicPhone],
    ])}

    <h3 style="margin:24px 0 8px;font-size:16px;color:#111827;">Payment Instructions</h3>
    <p style="margin:0 0 4px;font-size:14px;color:#374151;">Please settle the payment before your appointment. You can pay via:</p>
    <ul style="margin:8px 0 0;padding-left:20px;font-size:14px;color:#374151;">
      <li>GCash / Maya — send to the clinic's registered number</li>
      <li>Bank transfer — contact the clinic for details</li>
      <li>Cash — pay at the clinic on appointment day</li>
    </ul>
    <p style="margin:12px 0 0;font-size:14px;color:#374151;">After sending payment, upload your proof of payment through the booking portal so the clinic can verify it.</p>

    <p style="margin:24px 0 0;font-size:14px;color:#6b7280;">If you need to reschedule or cancel, please contact the clinic as soon as possible.</p>
  `;

  return { subject, html: baseLayout(data.clinicName, body) };
}

// ---------------------------------------------------------------------------
// Appointment Reminder
// ---------------------------------------------------------------------------
export function appointmentReminderEmail(data: {
  clinicName: string;
  patientName: string;
  serviceName: string;
  dentistName: string;
  date: string;
  time: string;
  clinicAddress: string;
  hoursUntil: number;
}): { subject: string; html: string } {
  const timeLabel = data.hoursUntil <= 3 ? "in a few hours" : "tomorrow";
  const subject = `Reminder: Your appointment is ${timeLabel} — ${data.clinicName}`;

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Appointment Reminder</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">Hi ${data.patientName}, this is a friendly reminder that your appointment is coming up ${timeLabel}.</p>

    ${detailsTable([
      ["Service", data.serviceName],
      ["Dentist", data.dentistName],
      ["Date", data.date],
      ["Time", data.time],
      ["Location", data.clinicAddress],
    ])}

    <p style="margin:16px 0 0;font-size:14px;color:#374151;">Please arrive 10-15 minutes early. If you need to cancel or reschedule, contact the clinic as soon as possible.</p>
  `;

  return { subject, html: baseLayout(data.clinicName, body) };
}

// ---------------------------------------------------------------------------
// Payment Confirmed
// ---------------------------------------------------------------------------
export function paymentConfirmedEmail(data: {
  clinicName: string;
  patientName: string;
  serviceName: string;
  date: string;
  time: string;
  amount: string;
}): { subject: string; html: string } {
  const subject = `Payment Confirmed — ${data.clinicName}`;

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Payment Confirmed</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">Hi ${data.patientName}, your payment has been verified by the clinic.</p>

    ${detailsTable([
      ["Service", data.serviceName],
      ["Date", data.date],
      ["Time", data.time],
      ["Amount Paid", data.amount],
    ])}

    <p style="margin:16px 0 0;font-size:14px;color:#374151;">You are all set for your appointment. See you there!</p>
  `;

  return { subject, html: baseLayout(data.clinicName, body) };
}

// ---------------------------------------------------------------------------
// Appointment Cancelled
// ---------------------------------------------------------------------------
export function appointmentCancelledEmail(data: {
  clinicName: string;
  patientName: string;
  serviceName: string;
  date: string;
  time: string;
  reason: string;
}): { subject: string; html: string } {
  const subject = `Appointment Cancelled — ${data.clinicName}`;

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#111827;">Appointment Cancelled</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">Hi ${data.patientName}, your appointment has been cancelled.</p>

    ${detailsTable([
      ["Service", data.serviceName],
      ["Date", data.date],
      ["Time", data.time],
      ["Reason", data.reason],
    ])}

    <p style="margin:16px 0 0;font-size:14px;color:#374151;">If this was a mistake or you would like to rebook, please visit the booking portal or contact the clinic directly.</p>
  `;

  return { subject, html: baseLayout(data.clinicName, body) };
}
