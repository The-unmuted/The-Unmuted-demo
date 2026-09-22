/**
 * WeChatGroupButton — header pill that opens a dialog showing the WeChat
 * user-testing group QR code. Present on every page (rendered inside the
 * global header in src/pages/Index.tsx), so testers can join the group
 * from anywhere in the flow.
 *
 * The QR image lives at /public/wechat-group-qr.jpg. Katie updates it
 * whenever the WeChat group QR expires (WeChat regenerates the invite QR
 * every 7 days or when the group changes).
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppLanguage, copyFor } from "@/lib/locale";

const QR_SRC = "/wechat-group-qr.jpg";

export default function WeChatGroupButton({ language }: { language: AppLanguage }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={copyFor(language, "Join the tester WeChat group", "加入内测微信群")}
          title={copyFor(language, "Join our WeChat tester group", "点击加入内测微信群")}
          className="group relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/55 bg-gradient-to-br from-primary/20 via-primary/10 to-card text-base leading-none text-primary shadow-[0_0_20px_hsl(var(--primary)/0.16)] transition-[background-color,box-shadow,transform] duration-100 ease-out hover:shadow-[0_0_26px_hsl(var(--primary)/0.28)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span aria-hidden="true" className="drop-shadow-[0_0_8px_hsl(var(--primary)/0.55)] transition-transform duration-100 ease-out group-hover:-translate-y-px">👗</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto rounded-3xl border-primary/25 bg-card p-6 pr-14 shadow-[0_24px_80px_hsl(240_70%_4%/0.65)] [&>button:last-child]:right-3 [&>button:last-child]:top-3 [&>button:last-child]:flex [&>button:last-child]:h-10 [&>button:last-child]:w-10 [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:rounded-full [&>button:last-child]:bg-background [&>button:last-child]:opacity-100 [&>button:last-child]:transition-[background-color,transform] [&>button:last-child]:duration-100 [&>button:last-child]:ease-out [&>button:last-child]:hover:bg-accent [&>button:last-child]:active:scale-95 [&>button:last-child]:focus-visible:outline-none [&>button:last-child]:focus-visible:ring-2 [&>button:last-child]:focus-visible:ring-ring [&>button:last-child]:focus-visible:ring-offset-2">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="text-center">
            {copyFor(language, "Join our WeChat tester group", "加入非默用户测试群")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {copyFor(
              language,
              "Scan with WeChat to join. Group QR refreshes weekly — if it fails, tap the 👗 again for the latest one.",
              "微信扫码加入。二维码每周会刷新，若扫描失败请再次点击 👗 获取最新二维码。",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-2">
          <img
            src={QR_SRC}
            alt={copyFor(language, "WeChat group QR code", "微信群二维码")}
            width={280}
            height={280}
            className="aspect-square w-full max-w-[280px] rounded-2xl border border-border bg-white p-3 shadow-sm"
          />
        </div>
        <p className="text-center text-[11px] leading-5 text-muted-foreground">
          {copyFor(
            language,
            "Your feedback shapes what we build next. Thank you.",
            "你的每一条反馈都在塑造非默下一步。谢谢你。",
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
