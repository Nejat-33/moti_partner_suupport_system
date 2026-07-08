import nodemailer from "nodemailer";
import { ENV } from "../config/env";

const getTransporter = () => {
  return nodemailer.createTransport({
    host: ENV.SMTP_HOST,
    port: Number(ENV.SMTP_PORT),
    secure: Number(ENV.SMTP_PORT) === 465,
    auth: {
      user: ENV.SMTP_USER,
      pass: ENV.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

export const sendVerificationEmail = async (
  toEmail: string,
  fullName: string,
  rawToken: string,
  userType: "CUSTOMER" | "STAFF",
): Promise<boolean> => {
  const baseUrl = ENV.FRONTEND_URL || "http://localhost:3000";
  const verificationUrl = `${baseUrl}/verify-email?token=${rawToken}&type=${userType.toLowerCase()}`;

  const htmlContent = `
    <div style="font-family: sans-serif; color: #334155; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
      <p style="font-size: 16px;">Hello ${fullName},</p>
      <p style="font-size: 14px;">Thank you for registering an internal account with us. To complete your setup and activate your account email address, please click the verification button below within the next 24 hours:</p>
      
      <table border="0" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
        <tr>
          <td align="center" bgcolor="#5182c4" style="border-radius: 12px;">
            <a href="${verificationUrl}" target="_blank" style="font-size: 14px; font-family: sans-serif; color: #ffffff; text-decoration: none; border-radius: 12px; padding: 12px 32px; border: 1px solid #5182c4; display: inline-block; font-weight: bold;">
              Verify Email Address
            </a>
          </td>
        </tr>
      </table>

      <p style="font-size: 12px; color: #64748b; margin-top: 30px;">
        If the button above does not work, copy and paste the link below directly into your web browser:
      </p>
      <p style="font-size: 12px; word-break: break-all;">
        <a href="${verificationUrl}" target="_blank" style="color: #5182c4;">${verificationUrl}</a>
      </p>
    </div>
  `;

  try {
    const transporter = getTransporter();

    await transporter.verify();

    const info = await transporter.sendMail({
      from: ENV.SMTP_FROM,
      to: toEmail,
      subject: "Verify Your MOTI Support Portal Account",
      html: htmlContent,
    });

    console.log("SMTP relay response:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
      envelope: info.envelope,
    });

    if (info.rejected && info.rejected.length > 0) {
      console.error("SMTP relay rejected these recipients:", info.rejected);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Nodemailer dispatch failure caught:", error);
    return false;
  }
};
