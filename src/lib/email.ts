import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: 'noreply@chhayheng.online',
    pass: 'B4zW-3qiB-2GX7-GDEm-bvQD-apd2'
  }
});

export const sendVerificationEmail = async (to: string, code: string) => {
  const mailOptions = {
    from: '"Chhayheng Store" <noreply@chhayheng.online>',
    to,
    subject: 'Your Verification Code',
    text: `Your verification code is: ${code}\nThis code will expire in 15 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Verify your email address</h2>
        <p>Your verification code is: <strong>${code}</strong></p>
        <p>This code will expire in 15 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `
  };
  try { await transporter.sendMail(mailOptions); } catch (e) { console.error('SMTP Error:', e); }
};

export const sendPasswordResetEmail = async (to: string, code: string) => {
  const mailOptions = {
    from: '"Chhayheng Store" <noreply@chhayheng.online>',
    to,
    subject: 'Password Reset Request',
    text: `Your password reset code is: ${code}\nThis code will expire in 15 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Reset your password</h2>
        <p>Your password reset code is: <strong>${code}</strong></p>
        <p>This code will expire in 15 minutes.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
      </div>
    `
  };
  try { await transporter.sendMail(mailOptions); } catch (e) { console.error('SMTP Error:', e); }
};

export const sendOrderNotificationEmail = async (to: string, orderId: string, productName: string, price: number, deliverables?: string) => {
  const deliverablesHtml = deliverables ? `
    <div style="margin-top: 20px; padding: 15px; border-left: 4px solid #00d2ff; background: #eef2ff;">
      <h3 style="margin-top: 0; color: #333;">Your Account/Link Details:</h3>
      <p style="white-space: pre-wrap; word-break: break-all; font-family: monospace; color: #111;">${deliverables}</p>
    </div>
  ` : '';

  const mailOptions = {
    from: '"Chhayheng Store" <noreply@chhayheng.online>',
    to,
    subject: `Order Confirmation: ${productName}`,
    text: `Thank you for your purchase!\nOrder ID: ${orderId}\nProduct: ${productName}\nAmount Paid: $${price}\n\n${deliverables ? 'Your Account/Link Details:\n' + deliverables + '\n\n' : ''}You can track the status of your order in your Customer Cabinet on the website.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
        <h2 style="color: #00d2ff;">Thank you for your purchase!</h2>
        <p>Your order has been successfully placed.</p>
        <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Product:</strong> ${productName}</p>
          <p><strong>Amount Paid:</strong> $${price}</p>
        </div>
        ${deliverablesHtml}
        <p>You can track the status of your order in your <strong>Customer Cabinet</strong> on the website.</p>
      </div>
    `
  };
  try { await transporter.sendMail(mailOptions); } catch (e) { console.error('SMTP Error:', e); }
};
