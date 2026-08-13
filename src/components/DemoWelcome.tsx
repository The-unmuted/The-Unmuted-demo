/**
 * DEMO-ONLY entry screen (hackathon-demo branch).
 *
 * Replaces LoginFlow for the UN hackathon build. No email, no password, no
 * OTP, no recovery code — one big button and a text block explaining what
 * the production flow looks like.
 */

import { PlayCircle } from "lucide-react";
import { copyFor, type AppLanguage } from "@/lib/locale";

interface DemoWelcomeProps {
  language: AppLanguage;
  onEnter: () => void;
}

export default function DemoWelcome({ language, onEnter }: DemoWelcomeProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
      <img
        src="/the-unmuted-mark.png"
        alt=""
        className="mb-6 h-20 w-20 object-contain drop-shadow-[0_0_24px_hsl(var(--primary)/0.32)]"
      />

      <h1 className="mb-2 text-lg font-black tracking-wide text-foreground">
        {copyFor(language, "The Unmuted · Demo", "非默 · Demo 演示版")}
      </h1>
      <p className="mb-6 max-w-md text-xs leading-5 text-muted-foreground">
        {copyFor(
          language,
          "Public demo for the UN hackathon. No sign-up, no password — just click Enter to explore the app.",
          "为联合国黑客松准备的公开演示版本。无需注册、无需密码，直接点击「进入 Demo」即可体验。"
        )}
      </p>

      <button
        onClick={onEnter}
        className="mb-8 inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.35)] transition-transform active:scale-95"
      >
        <PlayCircle className="h-4 w-4" />
        {copyFor(language, "Enter Demo", "进入 Demo")}
      </button>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card/70 p-4 text-left">
        <p className="mb-2 text-xs font-bold text-primary">
          {copyFor(
            language,
            "In the production version (removed for this demo):",
            "正式版本中（本 Demo 已跳过）："
          )}
        </p>
        <ul className="space-y-1.5 text-[11px] leading-5 text-muted-foreground">
          <li>
            {copyFor(
              language,
              "· Email registration + account password over HTTPS (Supabase Auth, bcrypt on the server)",
              "· 邮箱注册与账号密码登录（走 HTTPS 到 Supabase，服务器 bcrypt 存储）"
            )}
          </li>
          <li>
            {copyFor(
              language,
              "· A separate vault password derives an Argon2id key on-device; the server only ever sees ciphertext",
              "· 独立的保险柜密码在本地用 Argon2id 派生密钥；服务器只见密文，永不见明文"
            )}
          </li>
          <li>
            {copyFor(
              language,
              "· A 12-character paper recovery key as the only backup if the vault password is lost",
              "· 12 位纸质恢复钥匙作为唯一后备（防遗忘保险柜密码）"
            )}
          </li>
          <li>
            {copyFor(
              language,
              "· Records are stored on Tencent CloudBase in mainland China (post-ICP)",
              "· 证据密文存储在境内腾讯云（ICP 备案后）"
            )}
          </li>
        </ul>
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          {copyFor(
            language,
            'In this demo, when the app asks for a "vault password", just enter ',
            "本 Demo 中如果 App 要求输入「保险柜密码」，请直接输入 "
          )}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">123456</code>
          {copyFor(
            language,
            " (flow simulation only — real cryptography runs behind the scenes with a hardcoded demo key).",
            "（仅作流程模拟，幕后仍以硬编码 Demo 密钥执行真实的 AES-256-GCM 加密）。"
          )}
        </p>
      </div>
    </div>
  );
}
