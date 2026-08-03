import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = "非默 The Unmuted <onboarding@resend.dev>";

interface EmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
}

interface HookPayload {
  user: { email: string };
  email_data: EmailData;
}

function buildEmail(emailData: EmailData): { subject: string; html: string } {
  const { token, email_action_type } = emailData;

  const codeBlock = `
    <div style="background:#FFF1F2;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
      <span style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#E11D48;">${token}</span>
    </div>
    <p style="color:#6B7280;font-size:13px;">
      验证码10分钟内有效，请勿分享给他人。<br>
      This code expires in 10 minutes. Do not share it.
    </p>
  `;

  const wrapper = (title: string, titleEn: string, body: string) => `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#FEFCF9;">
      <h2 style="color:#E11D48;margin:0 0 4px;">非默 · The Unmuted</h2>
      <p style="color:#374151;font-size:16px;margin:0 0 8px;">${title}</p>
      <p style="color:#6B7280;font-size:14px;margin:0 0 4px;">${titleEn}</p>
      ${body}
    </div>
  `;

  if (email_action_type === "recovery") {
    return {
      subject: "【非默】重置密码验证码 / Password Reset Code",
      html: wrapper("您正在重置密码", "You requested a password reset", codeBlock),
    };
  }

  return {
    subject: "【非默】您的验证码 / Your verification code",
    html: wrapper("您的登录验证码", "Your sign-in verification code", codeBlock),
  };
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload: HookPayload = await req.json();
    const { user, email_data } = payload;
    const { subject, html } = buildEmail(email_data);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [user.email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend API error:", res.status, err);
      return new Response(JSON.stringify({ error: err }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Hook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
