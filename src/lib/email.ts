import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST     || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE   === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOrgInviteEmail({
  toEmail,
  toName,
  orgName,
  inviterName,
  projectNames,
  appUrl,
}: {
  toEmail: string;
  toName: string | null;
  orgName: string;
  inviterName: string;
  projectNames: string[];
  appUrl: string;
}) {
  const displayName = toName || toEmail;
  const projectList = projectNames.length
    ? projectNames.map((p) => `<li style="padding:4px 0;color:#94a3b8;">• ${p}</li>`).join('')
    : '<li style="padding:4px 0;color:#94a3b8;">No projects yet</li>';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#1e293b;border-radius:24px;overflow:hidden;border:1px solid #334155;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:40px 40px 32px;text-align:center;">
      <div style="width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:16px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:28px;">🏢</span>
      </div>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">You've been added to an Organization</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">Project Management System</p>
    </div>

    <!-- Body -->
    <div style="padding:36px 40px;">
      <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.6;">
        Hi <strong style="color:#f1f5f9;">${displayName}</strong>,
      </p>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.7;">
        <strong style="color:#e2e8f0;">${inviterName}</strong> has added you to the organization
        <strong style="color:#a78bfa;">${orgName}</strong>. You now have access to the following projects:
      </p>

      <!-- Projects -->
      <div style="background:#0f172a;border-radius:16px;border:1px solid #334155;padding:20px 24px;margin-bottom:28px;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6366f1;">Projects</p>
        <ul style="margin:0;padding:0;list-style:none;">
          ${projectList}
        </ul>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${appUrl}/dashboard"
          style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:15px;letter-spacing:0.3px;box-shadow:0 8px 24px rgba(99,102,241,0.3);">
          Open Dashboard →
        </a>
      </div>

      <p style="margin:0;color:#475569;font-size:13px;text-align:center;line-height:1.6;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:20px 40px;border-top:1px solid #334155;text-align:center;">
      <p style="margin:0;color:#475569;font-size:12px;">© ${new Date().getFullYear()} Project Management System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"PMS" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `You've been added to "${orgName}" on PMS`,
    html,
  });
}

export async function sendOrgRemovedEmail({
  toEmail,
  toName,
  orgName,
}: {
  toEmail: string;
  toName: string | null;
  orgName: string;
}) {
  const displayName = toName || toEmail;
  await transporter.sendMail({
    from: `"PMS" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `You've been removed from "${orgName}" on PMS`,
    html: `
<body style="background:#0f172a;font-family:Arial,sans-serif;padding:40px;">
  <div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:20px;padding:36px;border:1px solid #334155;">
    <h2 style="color:#f1f5f9;margin:0 0 16px;">Organization Access Removed</h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.7;">Hi ${displayName},<br><br>Your access to the organization <strong style="color:#f87171;">${orgName}</strong> has been removed. You no longer have access to its projects.</p>
    <p style="color:#475569;font-size:12px;margin-top:24px;">© ${new Date().getFullYear()} Project Management System</p>
  </div>
</body>`,
  });
}

export async function sendOtpEmail({
  toEmail,
  otp,
}: {
  toEmail: string;
  otp: string;
}) {
  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:400px;margin:40px auto;background:#1e293b;border-radius:24px;padding:40px;border:1px solid #334155;text-align:center;">
    <h1 style="color:#fff;font-size:24px;margin-bottom:8px;">Verify your email</h1>
    <p style="color:#94a3b8;font-size:14px;margin-bottom:32px;">Use the code below to complete your registration.</p>
    <div style="background:#0f172a;padding:20px;border-radius:16px;border:1px solid #334155;margin-bottom:32px;">
      <span style="font-size:32px;font-weight:800;letter-spacing:8px;color:#6366f1;font-family:monospace;">${otp}</span>
    </div>
    <p style="color:#475569;font-size:12px;">This code will expire in 10 minutes.</p>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"PMS Security" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Verify your email - ${otp}`,
    html,
  });
}

export async function sendPasswordResetEmail({
  toEmail,
  token,
  appUrl,
}: {
  toEmail: string;
  token: string;
  appUrl: string;
}) {
  const resetUrl = `${appUrl}/auth/reset-password?token=${token}`;
  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:400px;margin:40px auto;background:#1e293b;border-radius:24px;padding:40px;border:1px solid #334155;text-align:center;">
    <h1 style="color:#fff;font-size:24px;margin-bottom:8px;">Reset your password</h1>
    <p style="color:#94a3b8;font-size:14px;margin-bottom:32px;">Click the button below to set a new password for your account.</p>
    <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:15px;">Reset Password</a>
    <p style="color:#475569;font-size:12px;margin-top:32px;">This link will expire in 1 hour.</p>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"PMS Security" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Reset your password",
    html,
  });
}
