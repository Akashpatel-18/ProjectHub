import nodemailer from "nodemailer";
import { ENV } from "../config/env";

const transporter =
  ENV.GMAIL_USER && ENV.GMAIL_PASS
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: ENV.GMAIL_USER,
          pass: ENV.GMAIL_PASS,
        },
      })
    : null;

export async function sendWorkspaceInviteEmail(payload: {
  toEmail: string;
  inviterName: string;
  workspaceName: string;
  inviteUrl: string;
}) {
  const subject = `You've been invited to join ${payload.workspaceName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #7c3aed; margin-bottom: 20px;">Workspace Invitation</h2>
      <p style="font-size: 16px; color: #374151;">Hello,</p>
      <p style="font-size: 16px; color: #374151; line-height: 1.5;">
        <strong>${payload.inviterName}</strong> has invited you to collaborate on their project workspace <strong>${payload.workspaceName}</strong>.
      </p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${payload.inviteUrl}" style="background-color: #7c3aed; color: #ffffff; padding: 12px 24px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
      </div>
      <p style="font-size: 14px; color: #6b7280; line-height: 1.5;">
        Or copy and paste this link into your browser:<br/>
        <a href="${payload.inviteUrl}" style="color: #6366f1;">${payload.inviteUrl}</a>
      </p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">
        This email was sent dynamically by SaaS Project Management System.
      </p>
    </div>
  `;

  console.log(transporter);
  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"SaaS PM System" <${ENV.GMAIL_USER}>`,
        to: payload.toEmail,
        subject,
        html,
      });
      console.log(
        `✉️ Workspace invite email successfully sent via Nodemailer to: ${payload.toEmail}`,
      );
      return;
    } catch (error) {
      console.error("❌ Error sending via Nodemailer:", error);
    }
  }

  // Fallback beautiful console logger
  console.log(`
┌──────────────────────────────────────────────────────────┐
│ ✉️  [MOCK EMAIL LOG - NODEMAILER NOT CONFIGURED]         │
├──────────────────────────────────────────────────────────┤
│ To: ${payload.toEmail.padEnd(52)} │
│ Subject: ${subject.padEnd(47)} │
│                                                          │
│ Click the link below to accept the invitation:          │
│ ${payload.inviteUrl}                                     │
└──────────────────────────────────────────────────────────┘
  `);
}

export async function sendPasswordResetEmail(payload: {
  toEmail: string;
  resetUrl: string;
}) {
  const subject = "Reset your password";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #7c3aed; margin-bottom: 20px;">Password Reset Request</h2>
      <p style="font-size: 16px; color: #374151;">Hello,</p>
      <p style="font-size: 16px; color: #374151; line-height: 1.5;">
        We received a request to reset your password. If you did not make this request, you can safely ignore this email.
      </p>
      <div style="margin: 30px 0; text-align: center;">
        <a href="${payload.resetUrl}" style="background-color: #7c3aed; color: #ffffff; padding: 12px 24px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
      </div>
      <p style="font-size: 14px; color: #6b7280; line-height: 1.5;">
        Or copy and paste this link into your browser:<br/>
        <a href="${payload.resetUrl}" style="color: #6366f1;">${payload.resetUrl}</a>
      </p>
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">
        This email was sent dynamically by SaaS Project Management System.
      </p>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"SaaS PM System" <${ENV.GMAIL_USER}>`,
        to: payload.toEmail,
        subject,
        html,
      });
      console.log(
        `✉️ Reset password email successfully sent via Nodemailer to: ${payload.toEmail}`,
      );
      return;
    } catch (error) {
      console.error("❌ Error sending via Nodemailer:", error);
    }
  }

  // Fallback beautiful console logger
  console.log(`
┌──────────────────────────────────────────────────────────┐
│ ✉️  [MOCK EMAIL LOG - NODEMAILER NOT CONFIGURED]         │
├──────────────────────────────────────────────────────────┤
│ To: ${payload.toEmail.padEnd(52)} │
│ Subject: ${subject.padEnd(47)} │
│                                                          │
│ Click the link below to reset your password:             │
│ ${payload.resetUrl}                                      │
└──────────────────────────────────────────────────────────┘
  `);
}
