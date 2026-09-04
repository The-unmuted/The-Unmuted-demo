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
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-sm leading-none text-primary transition-colors hover:bg-primary/20 active:scale-95"
        >
          <span aria-hidden="true">👗</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
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
            className="w-full max-w-[280px] rounded-xl border border-border bg-white p-3 shadow-sm"
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
