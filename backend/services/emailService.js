const nodemailer = require('nodemailer');

// Frontend URL for email links (configurable via env, defaults to local dev)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Configure the email transporter using Mailtrap SMTP
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 2525,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ─────────────────────────────────────────────────────────
// Base template wrapper
// ─────────────────────────────────────────────────────────
const baseTemplate = (bodyContent) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);max-width:600px;width:100%;">
        
        <!-- Header -->
        <tr>
          <td style="background:#059669;padding:28px 32px;text-align:center;">
            <div style="display:inline-flex;align-items:center;gap:10px;">
              <div style="width:36px;height:36px;background:rgba(255,255,255,0.25);border-radius:8px;display:inline-block;line-height:36px;text-align:center;font-weight:700;font-size:18px;color:white;">R</div>
              <span style="color:white;font-size:20px;font-weight:700;letter-spacing:-0.3px;">PermitEase</span>
            </div>
            <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">Municipality of Roxas &mdash; Business Permit and Licensing Office</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${bodyContent}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F1F5F9;padding:20px 32px;text-align:center;font-size:12px;color:#94A3B8;line-height:1.6;">
            This is an automated notification from PermitEase.<br/>
            Municipality of Roxas, Oriental Mindoro &mdash; Business Permit and Licensing Office<br/>
            <span style="font-size:11px;">Please do not reply to this email.</span>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`;

const infoBlock = (rows) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-radius:8px;padding:16px 20px;margin:20px 0;">
    ${rows.map(([label, value]) => `
      <tr>
        <td style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;padding:5px 0;width:180px;">${label}</td>
        <td style="font-size:14px;font-weight:600;color:#1E293B;padding:5px 0;">${value || '—'}</td>
      </tr>
    `).join('')}
  </table>
`;

const ctaButton = (href, label) => `
  <div style="text-align:center;margin:28px 0;">
    <a href="${href}" style="display:inline-block;background:#059669;color:white;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">${label}</a>
  </div>
`;

const greeting = (name) => `<p style="font-size:15px;color:#334155;">Dear <strong>${name || 'Business Owner'}</strong>,</p>`;
const closing = () => `<p style="font-size:14px;color:#64748B;margin-top:24px;border-top:1px solid #E2E8F0;padding-top:16px;">Regards,<br/><strong style="color:#1E293B;">PermitEase</strong><br/>Municipality of Roxas &mdash; BPLO</p>`;

// ─────────────────────────────────────────────────────────
// Core sendEmail (graceful failure)
// ─────────────────────────────────────────────────────────
const sendEmail = async (to, subject, htmlContent) => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('[EmailService] Credentials not configured. Skipping email to:', to);
            return false;
        }
        const mailOptions = {
            from: `"PermitEase — BPLO Roxas" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html: htmlContent
        };
        const info = await transporter.sendMail(mailOptions);
        console.log('[EmailService] Sent:', info.response, '→', to);
        return true;
    } catch (error) {
        console.error('[EmailService] Failed to send to', to, ':', error.message);
        return false;
    }
};

// ─────────────────────────────────────────────────────────
// A. APPLICATION SUBMITTED
// ─────────────────────────────────────────────────────────
const sendApplicationSubmittedEmail = async ({ userEmail, userName, businessName, applicationNumber, applicationType, submittedAt }) => {
    const html = baseTemplate(`
        ${greeting(userName)}
        <p style="font-size:15px;color:#334155;">Your business permit application has been successfully submitted to the Municipality of Roxas BPLO.</p>
        ${infoBlock([
            ['Application No.', applicationNumber],
            ['Business', businessName],
            ['Type', applicationType === 'NEW' ? 'New Business Permit' : 'Renewal'],
            ['Status', '<span style="color:#2563EB;font-weight:700;">SUBMITTED</span>'],
            ['Submitted On', submittedAt],
        ])}
        <p style="font-size:14px;color:#64748B;">Your application is now queued for review by the LGU. You will be notified once a staff member begins reviewing it.</p>
        ${ctaButton(`${FRONTEND_URL}/applications`, 'View My Application')}
        ${closing()}
    `);
    return sendEmail(userEmail, `PermitEase — Application Submitted: ${applicationNumber}`, html);
};

// ─────────────────────────────────────────────────────────
// B. APPLICATION UNDER REVIEW
// ─────────────────────────────────────────────────────────
const sendApplicationUnderReviewEmail = async ({ userEmail, userName, businessName, applicationNumber }) => {
    const html = baseTemplate(`
        ${greeting(userName)}
        <p style="font-size:15px;color:#334155;">The LGU is now reviewing your business permit application.</p>
        ${infoBlock([
            ['Application No.', applicationNumber],
            ['Business', businessName],
            ['Status', '<span style="color:#D97706;font-weight:700;">UNDER REVIEW</span>'],
        ])}
        <p style="font-size:14px;color:#64748B;">Please wait while the BPLO evaluates your submission. You will be notified of any updates, including if corrections are needed or when a decision is made.</p>
        ${ctaButton(`${FRONTEND_URL}/applications`, 'View My Application')}
        ${closing()}
    `);
    return sendEmail(userEmail, `PermitEase — Application Under Review: ${applicationNumber}`, html);
};

// ─────────────────────────────────────────────────────────
// C. CORRECTION REQUESTED
// ─────────────────────────────────────────────────────────
const sendCorrectionRequestedEmail = async ({ userEmail, userName, businessName, applicationNumber, correctionNotes }) => {
    const html = baseTemplate(`
        ${greeting(userName)}
        <p style="font-size:15px;color:#334155;">The BPLO has reviewed your application and requires corrections before it can proceed.</p>
        ${infoBlock([
            ['Application No.', applicationNumber],
            ['Business', businessName],
            ['Status', '<span style="color:#DC2626;font-weight:700;">NEEDS CORRECTION</span>'],
        ])}
        <div style="background:#FEF3C7;border-left:4px solid #F59E0B;border-radius:6px;padding:16px 20px;margin:20px 0;">
          <div style="font-size:12px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Notes from BPLO</div>
          <div style="font-size:14px;color:#78350F;">${correctionNotes || 'Please log in to PermitEase for details.'}</div>
        </div>
        <p style="font-size:14px;color:#64748B;">Please log in to PermitEase, review the correction notes, make the necessary updates, and resubmit your application.</p>
        ${ctaButton(`${FRONTEND_URL}/applications`, 'Correct & Resubmit Application')}
        ${closing()}
    `);
    return sendEmail(userEmail, `PermitEase — Correction Required: ${applicationNumber}`, html);
};

// ─────────────────────────────────────────────────────────
// D. APPLICATION APPROVED
// ─────────────────────────────────────────────────────────
const sendApplicationApprovedEmail = async ({ userEmail, userName, businessName, applicationNumber, permitNumber, expirationDate }) => {
    const html = baseTemplate(`
        ${greeting(userName)}
        <p style="font-size:15px;color:#334155;">Congratulations! Your business permit application has been <strong style="color:#16A34A;">approved</strong> by the Municipality of Roxas.</p>
        ${infoBlock([
            ['Application No.', applicationNumber],
            ['Business', businessName],
            ['Status', '<span style="color:#16A34A;font-weight:700;">APPROVED</span>'],
            ...(permitNumber ? [['Permit No.', permitNumber]] : []),
            ...(expirationDate ? [['Permit Expires', expirationDate]] : []),
        ])}
        <p style="font-size:14px;color:#64748B;">Your official business permit has been generated. You may log in to PermitEase to view and download your permit document.</p>
        ${ctaButton(`${FRONTEND_URL}/permits`, 'View & Download My Permit')}
        ${closing()}
    `);
    return sendEmail(userEmail, `PermitEase — Application Approved: ${applicationNumber}`, html);
};

// ─────────────────────────────────────────────────────────
// E. APPLICATION REJECTED
// ─────────────────────────────────────────────────────────
const sendApplicationRejectedEmail = async ({ userEmail, userName, businessName, applicationNumber, rejectionReason }) => {
    const html = baseTemplate(`
        ${greeting(userName)}
        <p style="font-size:15px;color:#334155;">We regret to inform you that your business permit application has been rejected by the Municipality of Roxas BPLO.</p>
        ${infoBlock([
            ['Application No.', applicationNumber],
            ['Business', businessName],
            ['Status', '<span style="color:#DC2626;font-weight:700;">REJECTED</span>'],
        ])}
        <div style="background:#FEE2E2;border-left:4px solid #EF4444;border-radius:6px;padding:16px 20px;margin:20px 0;">
          <div style="font-size:12px;font-weight:700;color:#991B1B;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Reason for Rejection</div>
          <div style="font-size:14px;color:#7F1D1D;">${rejectionReason || 'Please contact the BPLO for further details.'}</div>
        </div>
        <p style="font-size:14px;color:#64748B;">If you believe this is in error or have questions, please contact the BPLO directly or visit PermitEase for more information.</p>
        ${ctaButton(`${FRONTEND_URL}/applications`, 'View Application')}
        ${closing()}
    `);
    return sendEmail(userEmail, `PermitEase — Application Rejected: ${applicationNumber}`, html);
};

// ─────────────────────────────────────────────────────────
// F. PERMIT ISSUED
// ─────────────────────────────────────────────────────────
const sendPermitIssuedEmail = async ({ userEmail, userName, businessName, permitNumber, verificationCode, expirationDate }) => {
    const html = baseTemplate(`
        ${greeting(userName)}
        <p style="font-size:15px;color:#334155;">Your official business permit has been issued by the Municipality of Roxas. You can now view and download your permit from PermitEase.</p>
        ${infoBlock([
            ['Business', businessName],
            ['Permit No.', `<strong style="color:#059669;">${permitNumber}</strong>`],
            ['Verification Code', verificationCode],
            ['Valid Until', expirationDate],
        ])}
        <p style="font-size:14px;color:#64748B;">Your permit includes a digital QR code that can be scanned to verify its authenticity. You may print or keep a digital copy for your records.</p>
        ${ctaButton(`${FRONTEND_URL}/permits`, 'Download My Permit')}
        ${closing()}
    `);
    return sendEmail(userEmail, `PermitEase — Your Business Permit Has Been Issued: ${permitNumber}`, html);
};

// ─────────────────────────────────────────────────────────
// G. RENEWAL REMINDER
// ─────────────────────────────────────────────────────────
const sendRenewalReminderEmail = async ({ userEmail, userName, businessName, permitNumber, expirationDate, daysRemaining }) => {
    const urgencyColor = daysRemaining <= 7 ? '#DC2626' : daysRemaining <= 30 ? '#D97706' : '#2563EB';
    const urgencyLabel = daysRemaining <= 7 ? 'URGENT' : daysRemaining <= 30 ? 'ACTION NEEDED' : 'REMINDER';
    const html = baseTemplate(`
        ${greeting(userName)}
        <p style="font-size:15px;color:#334155;">This is a reminder that your business permit is expiring soon. Please initiate the renewal process as soon as possible.</p>
        <div style="background:#FEF3C7;border-radius:8px;padding:20px;text-align:center;margin:20px 0;">
          <div style="font-size:13px;font-weight:700;color:${urgencyColor};text-transform:uppercase;letter-spacing:0.1em;">${urgencyLabel}</div>
          <div style="font-size:36px;font-weight:800;color:${urgencyColor};margin:8px 0;">${daysRemaining}</div>
          <div style="font-size:15px;color:#475569;font-weight:600;">days remaining</div>
        </div>
        ${infoBlock([
            ['Business', businessName],
            ['Permit No.', permitNumber],
            ['Expiration Date', expirationDate],
        ])}
        <p style="font-size:14px;color:#64748B;">To avoid penalties, please log in to PermitEase and begin your renewal application before the expiration date.</p>
        ${ctaButton(`${FRONTEND_URL}/renewals`, 'Start Renewal Process')}
        ${closing()}
    `);
    return sendEmail(userEmail, `PermitEase — Permit Renewal Reminder: ${daysRemaining} Days Left (${permitNumber})`, html);
};

// ─────────────────────────────────────────────────────────
// H. PERMIT EXPIRED
// ─────────────────────────────────────────────────────────
const sendPermitExpiredEmail = async ({ userEmail, userName, businessName, permitNumber, expirationDate }) => {
    const html = baseTemplate(`
        ${greeting(userName)}
        <p style="font-size:15px;color:#334155;">Your business permit has expired. Operating without a valid permit may result in penalties under local ordinances.</p>
        ${infoBlock([
            ['Business', businessName],
            ['Permit No.', permitNumber],
            ['Expired On', expirationDate],
            ['Status', '<span style="color:#DC2626;font-weight:700;">EXPIRED</span>'],
        ])}
        <p style="font-size:14px;color:#64748B;">Please log in to PermitEase immediately to initiate your renewal application.</p>
        ${ctaButton(`${FRONTEND_URL}/renewals`, 'Renew Now')}
        ${closing()}
    `);
    return sendEmail(userEmail, `PermitEase — Your Business Permit Has Expired: ${permitNumber}`, html);
};

// ─────────────────────────────────────────────────────────
// I. STATUTORY LGU NOTICE (RA 7160 SEC. 167 & 168)
// ─────────────────────────────────────────────────────────
const sendStatutoryNoticeEmail = async ({ userEmail, userName, businessName, permitNumber, expirationDate, noticeTitle, noticeBody, statutoryStage, daysUntilDeadline }) => {
    const isDelinquent = statutoryStage === 'DELINQUENT';
    const isWindow = statutoryStage === 'RENEWAL_WINDOW';
    const urgencyColor = isDelinquent ? '#DC2626' : isWindow ? '#D97706' : '#2563EB';
    const badgeLabel = isDelinquent ? 'STATUTORY DELINQUENCY NOTICE (RA 7160)' : isWindow ? 'ANNUAL RENEWAL WINDOW (JANUARY 1 - 20)' : 'ANNUAL EXPIRATION REMINDER';

    const html = baseTemplate(`
        ${greeting(userName)}
        <div style="background:${isDelinquent ? '#FEE2E2' : '#FEF3C7'};border:1px solid ${urgencyColor};border-radius:8px;padding:16px 20px;margin:20px 0;">
          <div style="font-size:12px;font-weight:700;color:${urgencyColor};text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">
            ${badgeLabel}
          </div>
          <div style="font-size:18px;font-weight:800;color:#1E293B;">
            ${noticeTitle}
          </div>
        </div>
        <p style="font-size:14px;color:#334155;line-height:1.6;">${noticeBody}</p>
        ${infoBlock([
            ['Business', businessName],
            ['Permit No.', permitNumber || 'N/A'],
            ['Expiration Date', expirationDate || 'December 31'],
            ['Legal Reference', 'Republic Act No. 7160 Sections 167 & 168'],
            ...(isDelinquent ? [['Statutory Surcharge', '<strong style="color:#DC2626;">25% Surcharge + 2% Monthly Interest Active</strong>']] : []),
            ...(isWindow && daysUntilDeadline !== undefined ? [['Penalty-Free Window', `<strong>${daysUntilDeadline} day(s) remaining until Jan 20</strong>`]] : [])
        ])}
        <p style="font-size:13px;color:#64748B;line-height:1.5;">
          Under the Local Government Code of 1991, all Philippine business permits expire annually on December 31. Please use PermitEase to prepare your requirements, estimate your fees, and schedule your fast-track City Hall walk-in.
        </p>
        ${ctaButton(`${FRONTEND_URL}/renewals`, 'Open Renewal Preparation')}
        ${closing()}
    `);
    return sendEmail(userEmail, `Official Notice — ${noticeTitle} (${businessName})`, html);
};

// ─────────────────────────────────────────────────────────
// Legacy function (preserve backward compatibility)
// ─────────────────────────────────────────────────────────
const sendPermitStatusEmail = async (userEmail, userName, businessName, permitName, status, remarks) => {
    return sendEmail(
        userEmail,
        `PermitEase — Permit Update: ${status} — ${businessName}`,
        baseTemplate(`
            ${greeting(userName)}
            <p style="font-size:15px;color:#334155;">There has been an update regarding your permit for <strong>${businessName}</strong>.</p>
            ${infoBlock([
                ['Permit', permitName],
                ['Status', status],
                ...(remarks ? [['Remarks', remarks]] : []),
            ])}
            ${ctaButton(`${FRONTEND_URL}/permits`, 'View My Permits')}
            ${closing()}
        `)
    );
};

const sendAssessmentCompleteEmail = async (userEmail, userName, businessName) => {
    return sendEmail(
        userEmail,
        `PermitEase — AI Assessment Complete: ${businessName}`,
        baseTemplate(`
            ${greeting(userName)}
            <p style="font-size:15px;color:#334155;">Your AI Permit Assessment for <strong>${businessName}</strong> has been generated.</p>
            ${ctaButton(`${FRONTEND_URL}/assessment`, 'View Assessment Results')}
            ${closing()}
        `)
    );
};

module.exports = {
    sendEmail,
    sendPermitStatusEmail,
    sendAssessmentCompleteEmail,
    sendApplicationSubmittedEmail,
    sendApplicationUnderReviewEmail,
    sendCorrectionRequestedEmail,
    sendApplicationApprovedEmail,
    sendApplicationRejectedEmail,
    sendPermitIssuedEmail,
    sendRenewalReminderEmail,
    sendPermitExpiredEmail,
    sendStatutoryNoticeEmail
};
