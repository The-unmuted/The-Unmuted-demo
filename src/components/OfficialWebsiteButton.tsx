import { Globe2 } from "lucide-react";
import { type AppLanguage, copyFor } from "@/lib/locale";

export const OFFICIAL_WEBSITE_URL = "https://the-unmuted-website.pages.dev/";

export default function OfficialWebsiteButton({ language }: { language: AppLanguage }) {
  const label = copyFor(
    language,
    "Visit The Unmuted official website",
    "访问非默官方网站",
    "Offizielle Website von The Unmuted besuchen",
  );

  return (
    <a
      href={OFFICIAL_WEBSITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="group inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/55 bg-gradient-to-br from-primary/20 via-primary/10 to-card text-primary shadow-[0_0_20px_hsl(var(--primary)/0.16)] transition-[background-color,box-shadow,transform] duration-100 ease-out hover:bg-primary/15 hover:shadow-[0_0_26px_hsl(var(--primary)/0.28)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Globe2
        className="h-5 w-5 drop-shadow-[0_0_8px_hsl(var(--primary)/0.45)] transition-transform duration-100 ease-out group-hover:-translate-y-px"
        aria-hidden="true"
      />
    </a>
  );
}
