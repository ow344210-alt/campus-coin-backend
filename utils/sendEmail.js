const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 10000,
});

const sendEmail = async ({ to, subject, text, html }) => {
  if (!to || !subject || (!text && !html)) {
    throw new Error("Email recipient, subject, and content are required");
  }

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || "CampusCoin"}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  };

  return await transporter.sendMail(mailOptions);
};

const sendPasswordResetEmail = async (to, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  const html = `
    <h2>CampusCoin - Password Reset</h2>
    <p>You requested a password reset. Click the link below (valid for 30 minutes):</p>
    <a href="${resetUrl}" target="_blank">${resetUrl}</a>
    <p>If you did not request this, you can safely ignore this email.</p>
  `;
  const text = `Reset your CampusCoin password (valid for 30 minutes): ${resetUrl}`;

  return sendEmail({ to, subject: "Reset your CampusCoin password", html, text });
};

const sendWelcomeEmail = async (to, name) => {
  const html = `
    <h2>Welcome to CampusCoin, ${name}!</h2>
    <p>Start logging your income and expenses to get personalized saving tips.</p>
  `;
  return sendEmail({ to, subject: "Welcome to CampusCoin 🎉", html });
};

const sendBudgetAlertEmail = async (to, categoryName, percentUsed) => {
  const html = `
    <h2>Budget Alert</h2>
    <p>Your <strong>${categoryName}</strong> spending has reached
    <strong>${percentUsed}%</strong> of this month's budget.</p>
  `;
  return sendEmail({ to, subject: `Budget alert: ${categoryName}`, html });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendBudgetAlertEmail,
};