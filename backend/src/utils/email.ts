import nodemailer from "nodemailer";
import { ENV } from "../config/env";

interface StatusEmailInput {
  customerEmail: string;
  customerName: string;
  caseNumber: string;
  subjectLine: string;
  newStatus: string;
}

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

export const sendStatusUpdateEmail = async (input: StatusEmailInput) => {
  const { customerEmail, customerName, caseNumber, subjectLine, newStatus } =
    input;

  const frontendTrackingUrl = `${process.env.FRONTEND_APP_URL || "http://localhost:3000"}/track/${caseNumber}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #2c3e50;">Case Update: ${caseNumber}</h2>
      <p>Hello ${customerName},</p>
      <p>The progress status for your recent service ticket, <strong>"${subjectLine}"</strong>, has changed.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; margin: 20px 0; border-radius: 4px;">
        <strong>New Status:</strong> <span style="color: #2980b9; font-weight: bold;">${newStatus}</span>
      </div>

      <p>You can follow the full lifecycle timeline, status updates, and milestones anytime using our real-time tracker:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${frontendTrackingUrl}" style="background-color: #3498db; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">Track Case Progress</a>
      </div>
      
      <p style="font-size: 12px; color: #7f8c8d; margin-top: 30px;">If the button above does not load, copy and paste this address into your browser window:<br>${frontendTrackingUrl}</p>
    </div>
  `;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: ENV.SMTP_FROM || '"MOTI Support System"',
      to: customerEmail,
      subject: `[Update] Case #${caseNumber} Status Changed to ${newStatus}`,
      html: htmlContent,
    });
  } catch (error) {
    console.error(
      `Critical non-blocking failure emitting transaction notification email to ${customerEmail}:`,
      error,
    );
  }
};

export const triggerResolutionEmail = async (caseReport: any): Promise<void> => {
  const customerEmail = caseReport.customer?.email;
  const customerName = caseReport.customer?.firstName || "Valued Customer";

  if (!customerEmail) {
    console.warn(`[EmailService] Skipped email notice: No email found for customer on case ID ${caseReport.id}`);
    return;
  }

  const FRONTEND_BASE_URL = ENV.FRONTEND_URL || "http://localhost:3000";

  const acceptAndRateLink = `${FRONTEND_BASE_URL}/cases/${caseReport.id}/feedback`;
  const rejectAndReopenLink = `${FRONTEND_BASE_URL}/cases/${caseReport.id}/reopen`;

  const emailSubject = `Case Resolved: #${caseReport.caseNumber || 'Update'} - ${caseReport.subject}`;

  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #2b6cb0; margin-bottom: 16px;">Your Case Has Been Resolved</h2>
      <p>Hello ${customerName},</p>
      <p>An agent has updated your support ticket and submitted a resolution summary for your review.</p>
      
      <div style="background-color: #f7fafc; border-left: 4px solid #4299e1; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
        <strong style="display: block; margin-bottom: 6px; color: #2d3748;">Resolution Summary:</strong>
        <p style="margin: 0; color: #4a5568; font-style: italic; white-space: pre-wrap;">"${caseReport.resolutionSummary}"</p>
      </div>

      <p style="margin-bottom: 24px;">Please take a moment to confirm if this issue is settled to your satisfaction:</p>
      
      <div style="margin-bottom: 24px;">
        <a href="${acceptAndRateLink}" style="background-color: #38a169; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 12px; margin-bottom: 12px;">
          Accept & Close Case
        </a>
        <a href="${rejectAndReopenLink}" style="background-color: #e53e3e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-bottom: 12px;">
          Reject & Reopen
        </a>
      </div>

      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #718096; line-height: 1.5;">
        <strong>Please Note:</strong> If you do not accept or reject this resolution within <strong>3 days</strong>, our system will automatically mark this case file as closed. If you require further help after that point, you will need to open a brand new support case.
      </p>
    </div>
  `;

  const transporter = getTransporter();

  await transporter.sendMail({
    from: ENV.SMTP_FROM || '"MOTI Support System"',
    to: customerEmail,
    subject: emailSubject,
    html: emailHtml,
  });
};


export const triggerAutoCloseEmail = async (caseReport: any): Promise<void> => {
  const customerEmail = caseReport.customer?.email;
  const customerName = caseReport.customer?.firstName || "Valued Customer";

  if (!customerEmail) return;

  const emailSubject = `Notice: Case #${caseReport.caseNumber || "Update"} has been closed automatically`;

  const emailHtml = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4a5568; margin-bottom: 16px;">Case Closed Due to Inactivity</h2>
      <p>Hello ${customerName},</p>
      <p>Your support case regarding <strong>"${caseReport.subject}"</strong> was marked as resolved 3 days ago.</p>
      <p>Because we didn't receive a confirmation or rejection response from you, our automated system has closed the ticket to keep our queues clear.</p>
      
      <div style="background-color: #fffaf0; border-left: 4px solid #dd6b20; padding: 16px; margin: 20px 0; border-radius: 0 4px 4px 0;">
        <p style="margin: 0; color: #dd6b20; font-weight: bold;">Need to continue working on this issue?</p>
        <p style="margin: 4px 0 0 0; color: #7b341e;">Please initialize a new support case report from your dashboard, and reference Case #${caseReport.caseNumber} so our agents can see the history.</p>
      </div>

      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 12px; color: #a0aec0; text-align: center;">Thank you for choosing our services.</p>
    </div>
  `;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: ENV.SMTP_FROM || '"MOTI Support System"',
    to: customerEmail,
    subject: emailSubject,
    html: emailHtml,
  });
};