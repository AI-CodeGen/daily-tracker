import nodemailer from 'nodemailer';

let transporter;

export function initMailer() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

export async function sendThresholdAlert(asset, price, boundary) {
  if (!process.env.ALERT_EMAIL_TO) return;
  const mailer = initMailer();
  const subject = `DailyTracker Alert: ${asset.symbol} ${boundary} threshold crossed`;
  const text = `${asset.name} (${asset.symbol}) price ${price} crossed ${boundary} threshold (${boundary === 'upper' ? asset.upperThreshold : asset.lowerThreshold}).`;
  await mailer.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.ALERT_EMAIL_TO,
    subject,
    text,
  });
}
