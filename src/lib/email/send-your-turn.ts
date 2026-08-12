import { getRequiredEnv } from "@/lib/env";

export interface SendYourTurnEmailParams {
 toEmail: string;
 recipientName: string;
 partnerName: string;
 loopUrl: string;
 cycleNumber: number;
 questionNumber: number;
 questionsPerCycle?: number;
}

export interface SendYourTurnEmailResult {
 sent: boolean;
 error?: string;
}

function getFromAddress(): string | null {
 const custom = getRequiredEnv("INVITE_FROM_EMAIL");
 if (custom) return `Aura & Anchor <${custom}>`;
 const apiKey = getRequiredEnv("RESEND_API_KEY");
 if (apiKey) return "Aura & Anchor <onboarding@resend.dev>";
 return null;
}

export function isYourTurnEmailConfigured(): boolean {
 return !!getRequiredEnv("RESEND_API_KEY");
}

function escapeHtml(text: string): string {
 return text
 .replace(/&/g, "&amp;")
 .replace(/</g, "&lt;")
 .replace(/>/g, "&gt;")
 .replace(/"/g, "&quot;");
}

function buildYourTurnHtml(params: SendYourTurnEmailParams): string {
 const { recipientName, partnerName, loopUrl, cycleNumber, questionNumber, questionsPerCycle = 5 } = params;
 return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f6f3;font-family:Georgia,'Times New Roman',serif;">
 <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f6f3;padding:40px 16px;">
 <tr><td align="center">
 <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
 <tr>
 <td style="background:linear-gradient(135deg,#7c6a9e 0%,#9b8bb8 100%);padding:32px 28px;text-align:center;">
 <p style="margin:0;font-size:28px;color:#ffffff;">Aura &amp; Anchor</p>
 <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);font-family:system-ui,sans-serif;">It&apos;s your turn</p>
 </td>
 </tr>
 <tr>
 <td style="padding:32px 28px;font-family:system-ui,-apple-system,sans-serif;color:#2d2a26;">
 <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
 Hi ${escapeHtml(recipientName)},
 </p>
 <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#5c5650;">
 A new reflection question is waiting for you in your healing loop with ${escapeHtml(partnerName)}.
 Question ${questionNumber} of ${questionsPerCycle} · Cycle ${cycleNumber}.
 </p>
 <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
 <tr>
 <td style="background:#7c6a9e;border-radius:12px;">
 <a href="${loopUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">
 Answer now
 </a>
 </td>
 </tr>
 </table>
 </td>
 </tr>
 </table>
 </td></tr>
 </table>
</body>
</html>`;
}

export async function sendYourTurnEmail(
 params: SendYourTurnEmailParams
): Promise<SendYourTurnEmailResult> {
 const apiKey = getRequiredEnv("RESEND_API_KEY");
 const from = getFromAddress();

 if (!apiKey || !from) {
 return { sent: false, error: "Email not configured" };
 }

 try {
 const res = await fetch("https://api.resend.com/emails", {
 method: "POST",
 headers: {
 Authorization: `Bearer ${apiKey}`,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 from,
 to: [params.toEmail],
 subject: `It's your turn - reflection with ${params.partnerName}`,
 html: buildYourTurnHtml(params),
 }),
 });

 if (!res.ok) {
 const body = await res.text();
 console.error("Resend your-turn error:", res.status, body);
 return { sent: false, error: `Email delivery failed (${res.status})` };
 }

 return { sent: true };
 } catch (err) {
 console.error("Resend your-turn fetch error:", err);
 return { sent: false, error: "Email delivery failed" };
 }
}
