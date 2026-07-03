import nodemailer from "nodemailer";
import SMTPConnection from "nodemailer/lib/smtp-connection";
import { ENV } from "../config/env";

const mailOptions: SMTPConnection.Options = {
  host: ENV.SMTP_HOST,
  port: Number(ENV.SMTP_PORT),
  secure: true,
  auth: {
    user: ENV.SMTP_USER,
    pass: ENV.SMTP_PASS,
  },
};

const transporter = nodemailer.createTransport(mailOptions);

export const sendVerificationEmail = async (
  toEmail: string,
  fullName: string,
  rawToken: string,
  partyType: "CUSTOMER" | "STAFF",
): Promise<boolean> => {
  const verificationUrl = `${ENV.FRONTEND_URL}/verify-email?token=${rawToken}&type=${partyType.toLowerCase()}`;

  const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #1a73e8; text-align: center;">Welcome to MOTI Support Portal</h2>
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>Thank you for registering an internal account with us. To complete your setup and activate your account email address, please click the verification button below within the next 24 hours:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="font-size: 12px; color: #666;">If the button above does not work, copy and paste the link below directly into your web browser:</p>
        <p style="font-size: 12px; color: #1a73e8; word-break: break-all;">${verificationUrl}</p>
        <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #999; text-align: center;">This is an automated system message. Please do not reply directly to this message.</p>
      </div>
    `;

  try {
    await transporter.sendMail({
      from: ENV.SMTP_FROM,
      to: toEmail,
      subject: "Verify Your MOTI Support Portal Account",
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error("Nodemailer dispatch failure:", error);
    return false;
  }
};
