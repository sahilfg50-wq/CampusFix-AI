// Sends complaint emails for free through a Gmail account (App Password, ~500 mails/day).
//
// Setup (optional): in functions/.env.local
//   SMTP_USER=yourname@gmail.com
//   SMTP_PASS=<16-character Gmail App Password>   (Google Account -> Security -> App passwords)
//
// Without SMTP settings nothing is sent. The email is still stored in the "mailOutbox"
// collection with status "simulated", so admins can see exactly what would have gone out.

import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

// mail: { to, cc, subject, text, complaintId, department, kind }
// Returns the outbox record that was saved.
export async function sendMail(db, mail, { log } = {}) {
  const smtp = getTransporter();
  const record = {
    to: mail.to,
    cc: mail.cc || null,
    subject: mail.subject,
    text: mail.text,
    complaintId: mail.complaintId || null,
    department: mail.department || null,
    kind: mail.kind || 'complaint',
    status: 'simulated',
    error: null,
    createdAt: new Date().toISOString(),
  };

  if (smtp) {
    try {
      await smtp.sendMail({
        from: `CampusFix AI <${process.env.SMTP_USER}>`,
        to: mail.to,
        cc: mail.cc || undefined,
        subject: mail.subject,
        text: mail.text,
      });
      record.status = 'sent';
    } catch (error) {
      record.status = 'failed';
      record.error = String(error?.message || error).slice(0, 300);
      log?.(error);
    }
  }

  const ref = await db.collection('mailOutbox').add(record);
  return { id: ref.id, ...record };
}
