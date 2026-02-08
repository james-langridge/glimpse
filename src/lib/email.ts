import { Resend } from "resend";

let resend: Resend;

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendDownloadEmail({
  to,
  downloadUrl,
  photoName,
  linkTitle,
}: {
  to: string;
  downloadUrl: string;
  photoName: string;
  linkTitle: string | null;
}) {
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  const context = linkTitle ? ` from "${escapeHtml(linkTitle)}"` : "";

  await getResend().emails.send({
    from,
    to,
    subject: `Your photo: ${photoName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 16px;">Your photo is ready</h2>
        <p style="color: #555; margin: 0 0 24px;">
          Click below to download <strong>${escapeHtml(photoName)}</strong>${context}.
        </p>
        <a href="${downloadUrl}"
           style="display: inline-block; background: #18181b; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
          Download photo
        </a>
        <p style="color: #888; font-size: 13px; margin: 24px 0 0;">
          Or copy and paste this link: <a href="${downloadUrl}" style="color: #888;">${downloadUrl}</a>
        </p>
        <p style="color: #888; font-size: 13px; margin: 12px 0 0;">
          This link expires in 1 hour and can only be used once.
        </p>
        <p style="color: #888; font-size: 13px; margin: 8px 0 0;">
          This photo has been personalized with a digital watermark linked to your download.
        </p>
      </div>
    `,
  });
}
