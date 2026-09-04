import { useMemo, useState } from "react";
import {
  Phone,
  Globe,
  MapPin,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  Check,
  Search,
  Mail,
} from "lucide-react";
import { AppLanguage, copyFor } from "@/lib/locale";
import {
  AidCategory,
  AidResource,
  KIND_LABEL,
  TAG_LABEL,
  filterByCity,
  hasCityEntries,
  isStale,
  resourcesFor,
  verifiedLabel,
} from "@/lib/aidDirectory";
import { CHINA_CITIES, ChinaCity, cityMatchesQuery } from "@/data/chinaCities";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { openFeedbackWidget } from "@/components/FeedbackWidget";

export default function AidResourceList({
  category,
  language,
}: {
  category: AidCategory;
  language: AppLanguage;
}) {
  const [city, setCity] = useState<ChinaCity | null>(null);

  const nationwide = useMemo(
    () => resourcesFor(category).filter((r) => r.city === null),
    [category],
  );
  const cityResources = useMemo(
    () => (city ? filterByCity(resourcesFor(category), city.name).filter((r) => r.city === city.name) : []),
    [category, city],
  );

  const cityIsCovered = city ? hasCityEntries(category, city.name) : false;

  return (
    <div className="space-y-4">
      {/* City picker */}
      <CityPicker
        category={category}
        selected={city}
        onChange={setCity}
        language={language}
      />

      {/* Submit-a-local-resource CTA — kept next to the city picker so it
          is discoverable while the user is deciding what city to view. */}
      <SubmitLocalCTA language={language} city={city} category={category} />

      {/* When a city is selected but not yet in our directory */}
      {city && !cityIsCovered && (
        <PlaceholderCard city={city} language={language} category={category} />
      )}

      {/* City-specific entries */}
      {cityResources.length > 0 && (
        <div className="space-y-3">
          <SectionLabel
            label={copyFor(
              language,
              `In ${city!.nameEn}`,
              `${city!.name} · 本地资源`,
            )}
          />
          {cityResources.map((r) => (
            <ResourceCard key={r.id} resource={r} category={category} language={language} />
          ))}
        </div>
      )}

      {/* Nationwide entries — always shown */}
      {nationwide.length > 0 && (
        <div className="space-y-3">
          <SectionLabel
            label={copyFor(language, "Nationwide", "全国通用")}
            hint={
              city
                ? copyFor(
                    language,
                    "These work anywhere in mainland China.",
                    "以下热线在全国范围内均可拨打。",
                  )
                : undefined
            }
          />
          {nationwide.map((r) => (
            <ResourceCard key={r.id} resource={r} category={category} language={language} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── City picker (searchable) ─────────────────────────────────────

function CityPicker({
  category,
  selected,
  onChange,
  language,
}: {
  category: AidCategory;
  selected: ChinaCity | null;
  onChange: (c: ChinaCity | null) => void;
  language: AppLanguage;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => CHINA_CITIES.filter((c) => cityMatchesQuery(c, query)),
    [query],
  );

  // Sort: cities we have local entries for float to the top.
  const sorted = useMemo(() => {
    const withData: ChinaCity[] = [];
    const withoutData: ChinaCity[] = [];
    for (const c of filtered) {
      (hasCityEntries(category, c.name) ? withData : withoutData).push(c);
    }
    return { withData, withoutData };
  }, [filtered, category]);

  const placeholder = copyFor(
    language,
    "Select your city",
    "选择你所在的城市",
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm font-semibold text-foreground shadow-sm active:scale-[0.99]"
        >
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {selected ? copyFor(language, selected.nameEn, selected.name) : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[min(92vw,22rem)] p-0"
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copyFor(
              language,
              "City name / pinyin / initials",
              "输入城市名或拼音（如 shanghai / sh）",
            )}
            className="w-full bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
        </div>

        <div className="max-h-72 overflow-y-auto py-1">
          {/* "All" reset row */}
          <CityRow
            label={copyFor(language, "All (nationwide only)", "全部（仅显示全国热线）")}
            active={selected === null}
            hasData={false}
            onSelect={() => {
              onChange(null);
              setOpen(false);
            }}
          />

          {sorted.withData.length > 0 && (
            <>
              <div className="mt-1 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary/80">
                {copyFor(language, "Covered cities", "已收录城市")}
              </div>
              {sorted.withData.map((c) => (
                <CityRow
                  key={c.name}
                  label={copyFor(language, c.nameEn, c.name)}
                  active={selected?.name === c.name}
                  hasData
                  onSelect={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                />
              ))}
            </>
          )}

          {sorted.withoutData.length > 0 && (
            <>
              <div className="mt-1 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {copyFor(language, "Other cities", "其他城市")}
              </div>
              {sorted.withoutData.map((c) => (
                <CityRow
                  key={c.name}
                  label={copyFor(language, c.nameEn, c.name)}
                  active={selected?.name === c.name}
                  hasData={false}
                  onSelect={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                />
              ))}
            </>
          )}

          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {copyFor(language, "No matching city.", "没有匹配的城市。")}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function CityRow({
  label,
  active,
  hasData,
  onSelect,
}: {
  label: string;
  active: boolean;
  hasData: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
        active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary/60"
      }`}
    >
      <span className="flex items-center gap-2">
        {label}
        {hasData && (
          <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
            ●
          </span>
        )}
      </span>
      {active && <Check className="h-4 w-4" />}
    </button>
  );
}

function SectionLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      {hint && <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

// ─── Placeholder for un-covered cities ────────────────────────────

function PlaceholderCard({
  city,
  language,
  category,
}: {
  city: ChinaCity;
  language: AppLanguage;
  category: AidCategory;
}) {
  const kindLabel = category === "psych"
    ? copyFor(language, "mental health", "心理")
    : copyFor(language, "legal aid", "法律援助");

  return (
    <div className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div className="flex-1">
          <p className="text-sm font-bold text-amber-300">
            {copyFor(
              language,
              `${city.nameEn} — not yet verified, pending collection`,
              `${city.name} · 还未核查，待收录`,
            )}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {copyFor(
              language,
              `We have not yet verified local ${kindLabel} resources for ${city.nameEn}. Please use the nationwide hotlines below — they cover all of mainland China.`,
              `我们尚未核实 ${city.name} 本地的${kindLabel}资源。请优先拨打下方全国热线，它们覆盖全国范围。`,
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Submit-a-local-resource CTA ──────────────────────────────────

function SubmitLocalCTA({
  language,
  city,
  category,
}: {
  language: AppLanguage;
  city: ChinaCity | null;
  category: AidCategory;
}) {
  const handleClick = () => {
    const cityLabelZh = city ? city.name : "（请填写你所在的城市）";
    const cityLabelEn = city ? city.nameEn : "(please fill in your city)";
    const categoryZh = category === "psych" ? "心理" : "法律援助";
    const categoryEn = category === "psych" ? "Mental health" : "Legal aid";

    const templateZh =
      `【本地援助资源推荐】\n\n` +
      `城市：${cityLabelZh}\n` +
      `类别：${categoryZh}\n` +
      `机构/热线名称：\n` +
      `电话：\n` +
      `服务时间：\n` +
      `联系方式或地址：\n` +
      `来源（官网或新闻链接）：\n` +
      `备注：`;

    const templateEn =
      `[Local aid resource submission]\n\n` +
      `City: ${cityLabelEn}\n` +
      `Category: ${categoryEn}\n` +
      `Name of the service:\n` +
      `Phone / hotline:\n` +
      `Hours:\n` +
      `How to reach / address:\n` +
      `Source (official website or news article):\n` +
      `Notes for us:`;

    openFeedbackWidget({
      type: "other",
      message: copyFor(language, templateEn, templateZh),
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 active:scale-[0.99]"
    >
      <Mail className="h-3.5 w-3.5" />
      {copyFor(
        language,
        city
          ? `Know a verified hotline in ${city.nameEn}? Tell us`
          : "Know a verified local hotline? Tell us",
        city
          ? `你知道 ${city.name} 可用的热线？告诉我们`
          : "你知道本市可用的热线？告诉我们",
      )}
    </button>
  );
}

// ─── Resource card ────────────────────────────────────────────────

function ResourceCard({
  resource: r,
  category,
  language,
}: {
  resource: AidResource;
  category: AidCategory;
  language: AppLanguage;
}) {
  const kind = KIND_LABEL[r.kind];
  const stale = isStale(r);
  const tags = r.tags.filter((t) => t !== category);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-bold leading-snug text-foreground">
          {copyFor(language, r.nameEn, r.name)}
        </span>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${kind.color}`}>
          {copyFor(language, kind.en, kind.zh)}
        </span>
        <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {r.city ? copyFor(language, r.cityEn!, r.city) : copyFor(language, "Nationwide", "全国")}
        </span>
      </div>

      {tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-primary/5 px-2 py-0.5 text-[10px] text-primary/80"
            >
              {copyFor(language, TAG_LABEL[t].en, TAG_LABEL[t].zh)}
            </span>
          ))}
        </div>
      )}

      <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
        {copyFor(language, r.descriptionEn, r.description)}
      </p>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" />
          {copyFor(language, r.hoursEn, r.hours)}
        </span>
        {r.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {copyFor(language, r.locationEn ?? r.location, r.location)}
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        {r.phone && (
          <a
            href={`tel:${r.phone}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary/10 py-2.5 text-xs font-bold text-primary transition-transform active:scale-95"
          >
            <Phone className="h-3.5 w-3.5" />
            {r.phone}
          </a>
        )}
        {r.websiteUrl && (
          <a
            href={r.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2.5 text-xs font-bold text-foreground/70 transition-transform active:scale-95"
          >
            <Globe className="h-3.5 w-3.5" />
            {copyFor(language, "Website", "官网")}
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
        )}
      </div>

      <div
        className={`mt-2 flex items-center gap-1 text-[10px] ${
          stale ? "text-amber-400" : "text-muted-foreground/60"
        }`}
      >
        {stale ? (
          <>
            <AlertTriangle className="h-3 w-3 shrink-0" />
            {copyFor(
              language,
              `${verifiedLabel(r, language)} — may be outdated; if unreachable call 12338 / 12348.`,
              `${verifiedLabel(r, language)} — 信息可能过期，若打不通请优先拨 12338 / 12348。`,
            )}
          </>
        ) : (
          <>
            <ShieldCheck className="h-3 w-3 shrink-0" />
            {verifiedLabel(r, language)}
          </>
        )}
      </div>
    </div>
  );
}
