/**
 * Email Notification Service (Safe, Non-Blocking, & Configurable)
 * Dispatches notification when a new contact/listing inquiry arrives.
 * Uses nodemailer if SMTP env is present, or logs a structured audit notification.
 */

export async function sendAdminContactNotification({ adminEmail, request }) {
  const timestamp = new Date().toLocaleString();
  const title = request.itemName || 'Listing/Contact Inquiry';

  // If SMTP credentials exist in process.env, attempt real email delivery
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: `"EventSphere Admin Inquiries" <${process.env.SMTP_FROM || 'no-reply@campus.edu'}>`,
        to: adminEmail,
        subject: `[EventSphere New Request] ${request.requestType}: ${title}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
            <h2 style="color: #4338ca; border-bottom: 2px solid #e0e7ff; padding-bottom: 8px;">
              New Private Admin Listing / Contact Request
            </h2>
            <p><strong>Request Type:</strong> <span style="background: #ede9fe; color: #5b21b6; padding: 3px 8px; border-radius: 4px;">${request.requestType}</span></p>
            <p><strong>Submitted By:</strong> ${request.name} (&lt;<a href="mailto:${request.email}">${request.email}</a>&gt;)</p>
            <p><strong>Contact Phone:</strong> <a href="tel:${request.phone}">${request.phone}</a></p>
            ${request.itemName ? `<p><strong>Property/Event Name:</strong> ${request.itemName}</p>` : ''}
            ${request.location ? `<p><strong>Location:</strong> ${request.location}</p>` : ''}
            <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 12px; margin: 16px 0; border-radius: 4px;">
              <p style="margin: 0; font-weight: bold; color: #475569;">User Message / Description:</p>
              <p style="margin: 8px 0 0 0; line-height: 1.5;">${request.message}</p>
            </div>
            <p style="font-size: 12px; color: #94a3b8;">
              Received at: ${timestamp} · Please open the Admin Dashboard to review and convert this request.
            </p>
          </div>
        `,
      });
      console.log(`[Email Service] Delivered notification email to ${adminEmail}`);
      return { delivered: true, recipient: adminEmail };
    } catch (err) {
      console.warn(`[Email Service] SMTP dispatch failed (${err.message}). Falling back to system log.`);
    }
  }

  // Fallback / Standard Mode: Structured System Logging
  console.log(`[Admin Notification Dispatcher] Notice for Admin <${adminEmail}>:`);
  console.log(`  -> Type: ${request.requestType}`);
  console.log(`  -> Sender: ${request.name} <${request.email}> | Phone: ${request.phone}`);
  console.log(`  -> Item: ${request.itemName || 'N/A'} | Location: ${request.location || 'N/A'}`);
  console.log(`  -> Message: ${request.message}`);

  return { delivered: false, simulated: true, recipient: adminEmail };
}
