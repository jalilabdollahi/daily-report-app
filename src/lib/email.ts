import nodemailer from "nodemailer";

type ReminderEmailPayload = {
  to: string;
  name: string;
  dashboardUrl: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    from,
  };
}

export async function sendReminderEmail({
  dashboardUrl,
  name,
  to,
}: ReminderEmailPayload) {
  const config = getSmtpConfig();
  const subject = "Daily Report Reminder - Log Your Tasks";
  const text = `Hi ${name}, you haven't logged any tasks today. Open your dashboard to add your daily report: ${dashboardUrl}`;

  if (!config) {
    console.info("Reminder email skipped because SMTP is not configured.", {
      dashboardUrl,
      subject,
      to,
    });
    return { delivered: false, reason: "smtp_not_configured" as const };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html: `<p>Hi ${name},</p><p>You haven't logged any tasks today.</p><p><a href="${dashboardUrl}">Open your dashboard to add your daily report.</a></p>`,
  });

  return { delivered: true as const };
}
