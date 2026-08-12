import { getRequiredEnv } from "@/lib/env";

export interface SendInviteEmailParams {
 toEmail: string;
 inviteLink: string;
 senderName: string;
 relationshipType: string;
}

export interface SendInviteEmailResult {
 sent: boolean;
 error?: string;
}

function getInviteFromAddress(): string | null {
 const custom = getRequiredEnv("INVITE_FROM_EMAIL");
 if (custom) return `Aura & Anchor <${custom}>`;
 const apiKey = getRequiredEnv("RESEND_API_KEY");
 if (apiKey) return "Aura & Anchor <onboarding@resend.dev>";
 return null;
}

export function isInviteEmailConfigured(): boolean {
 return !!getRequiredEnv("RESEND_API_KEY");
}

function buildInviteEmailHtml(
 senderName: string,
 toEmail: string,
 inviteLink: string,
 relationshipType: string
): string {
 const typeLabel = relationshipType.replace(/_/g, " ");
 return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f6f3;font-family:Georgia,'Times New Roman',serif;">
 <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f3;padding:40px 16px;">
 <tr><td align="center">
 <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
 <tr>
 <td style="background:linear-gradient(135deg,#7c6a9e 0%,#9b8bb8 100%);padding:32px 28px;text-align:center;">
 <p style="margin:0;font-size:28px;color:#ffffff;letter-spacing:0.5px;">Aura &amp; Anchor</p>
 <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);font-family:system-ui,sans-serif;">A healing space for two</p>
 </td>
 </tr>
 <tr>
 <td style="padding:32px 28px;font-family:system-ui,-apple-system,sans-serif;color:#2d2a26;">
 <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
 <strong>${escapeHtml(senderName)}</strong> has invited you to begin healing together as ${escapeHtml(typeLabel)}s on Aura &amp; Anchor.
 </p>
 <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#5c5650;">
 This is a private, compassionate space where you&apos;ll share your perspectives and receive thoughtful guidance - together.
 </p>
 <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
 <tr>
 <td style="background:#7c6a9e;border-radius:12px;">
 <a href="${inviteLink}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">
 Accept invitation
 </a>
 </td>
 </tr>
 </table>
 <p style="margin:0 0 8px;font-size:13px;color:#8a8279;">Or copy this link into your browser:</p>
 <p style="margin:0;font-size:12px;word-break:break-all;color:#7c6a9e;">${inviteLink}</p>
 <hr style="margin:28px 0;border:none;border-top:1px solid #ebe6df;">
 <p style="margin:0;font-size:12px;color:#a39e96;line-height:1.5;">
 This link expires in 7 days. Please sign in with <strong>${escapeHtml(toEmail)}</strong> when you accept.
 </p>
 </td>
 </tr>
 </table>
 <p style="margin:24px 0 0;font-size:11px;color:#a39e96;font-family:system-ui,sans-serif;">
 Sent with care from Aura &amp; Anchor
 </p>
 </td></tr>
 </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
 return text
 .replace(/&/g, "&amp;")
 .replace(/</g, "&lt;")
 .replace(/>/g, "&gt;")
 .replace(/"/g, "&quot;");
}

export async function sendInviteEmail(
 params: SendInviteEmailParams
): Promise<SendInviteEmailResult> {
 const apiKey = getRequiredEnv("RESEND_API_KEY");
 const from = getInviteFromAddress();

 if (!apiKey || !from) {
 return { sent: false, error: "Email not configured" };
 }

 const { toEmail, inviteLink, senderName, relationshipType } = params;
 const html = buildInviteEmailHtml(senderName, toEmail, inviteLink, relationshipType);

 try {
 const res = await fetch("https://api.resend.com/emails", {
 method: "POST",
 headers: {
 Authorization: `Bearer ${apiKey}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 from,
 to: [toEmail],
 subject: `${senderName} invited you to Aura & Anchor`,
 html,
 }),
 });

 if (!res.ok) {
 const body = await res.text();
 console.error("Resend error:", res.status, body);
 return { sent: false, error: `Email delivery failed (${res.status})` };
 }

 return { sent: true };
 } catch (err) {
 console.error("Resend fetch error:", err);
 return { sent: false, error: "Email delivery failed" };
 }
}
