/**
 * 法律援助 — Legal Aid
 * Chinese domestic non-profit organizations and legal aid centers
 * with phone, website, and address.
 */
import { Scale, Phone, Globe, MapPin, Clock, ExternalLink } from "lucide-react";
import { AppLanguage, copyFor } from "@/lib/locale";

interface LegalPageProps {
  language: AppLanguage;
}

type OrgType = "hotline" | "legal" | "shelter" | "rights";

interface LegalOrg {
  id: string;
  name: string;
  nameEn: string;
  type: OrgType;
  phone?: string;
  website?: string;
  websiteUrl?: string;
  address?: string;
  addressEn?: string;
  hours: string;
  hoursEn: string;
  description: string;
  descriptionEn: string;
  coverage: string;
  coverageEn: string;
}

const TYPE_LABEL: Record<OrgType, { zh: string; en: string; color: string }> = {
  hotline: { zh: "热线", en: "Hotline", color: "bg-red-500/10 text-red-400" },
  legal:   { zh: "法援", en: "Legal Aid", color: "bg-blue-500/10 text-blue-400" },
  shelter: { zh: "庇护", en: "Shelter", color: "bg-amber-500/10 text-amber-400" },
  rights:  { zh: "维权", en: "Rights", color: "bg-purple-500/10 text-purple-400" },
};

const ORGS: LegalOrg[] = [
  {
    id: "1",
    name: "全国妇女儿童权益保护热线",
    nameEn: "National Women & Children Rights Hotline",
    type: "hotline",
    phone: "12338",
    hours: "24小时",
    hoursEn: "24 / 7",
    description: "全国妇联官方维权热线，受理家庭暴力、性骚扰、歧视等投诉，可协助转介援助资源",
    descriptionEn: "All-China Women's Federation official hotline for domestic violence, harassment, and discrimination. Can refer to support resources.",
    coverage: "全国",
    coverageEn: "Nationwide",
  },
  {
    id: "2",
    name: "全国法律援助热线",
    nameEn: "National Legal Aid Hotline",
    type: "hotline",
    phone: "12348",
    website: "12348.gov.cn",
    websiteUrl: "https://www.12348.gov.cn",
    hours: "24小时",
    hoursEn: "24 / 7",
    description: "司法部免费法律咨询热线，可申请指派法律援助律师，覆盖家暴、离婚、人身安全令等",
    descriptionEn: "Ministry of Justice free legal consultation. Can request an appointed lawyer for domestic violence, divorce, and protective orders.",
    coverage: "全国",
    coverageEn: "Nationwide",
  },
  {
    id: "3",
    name: "中国法律援助基金会",
    nameEn: "China Legal Aid Foundation",
    type: "legal",
    phone: "010-65126765",
    website: "chinalaf.org.cn",
    websiteUrl: "https://www.chinalaf.org.cn",
    address: "北京市西城区",
    addressEn: "Xicheng, Beijing",
    hours: "工作日 9:00 – 17:00",
    hoursEn: "Weekdays 9 am – 5 pm",
    description: "为困难群体提供法律援助，包括家庭暴力受害者，可申请免费律师代理",
    descriptionEn: "Legal aid for vulnerable groups including domestic violence victims. Free lawyer representation available.",
    coverage: "全国",
    coverageEn: "Nationwide",
  },
  {
    id: "4",
    name: "北京众泽妇女援助中心",
    nameEn: "Beijing Zhongze Women's Legal Aid",
    type: "rights",
    phone: "010-67260366",
    address: "北京市朝阳区",
    addressEn: "Chaoyang, Beijing",
    hours: "工作日 9:00 – 17:00",
    hoursEn: "Weekdays 9 am – 5 pm",
    description: "专注女性权益保护，为家庭暴力、性骚扰受害者提供法律援助、心理疏导及庇护转介",
    descriptionEn: "Focused on women's rights. Legal aid, counseling, and shelter referrals for domestic violence and harassment survivors.",
    coverage: "北京",
    coverageEn: "Beijing",
  },
  {
    id: "5",
    name: "广州番禺妇女儿童庇护中心",
    nameEn: "Guangzhou Panyu Women & Children Shelter",
    type: "shelter",
    phone: "020-34554137",
    address: "广州市番禺区",
    addressEn: "Panyu, Guangzhou",
    hours: "24小时",
    hoursEn: "24 / 7",
    description: "为家庭暴力受害者提供紧急庇护，免费，保密，可提供法律咨询与心理疏导",
    descriptionEn: "Emergency shelter for domestic violence victims. Free, confidential. Legal and psychological support available.",
    coverage: "广州",
    coverageEn: "Guangzhou",
  },
  {
    id: "6",
    name: "上海市法律援助中心",
    nameEn: "Shanghai Legal Aid Center",
    type: "legal",
    phone: "021-12348",
    address: "上海市黄浦区",
    addressEn: "Huangpu, Shanghai",
    hours: "工作日 9:00 – 17:00",
    hoursEn: "Weekdays 9 am – 5 pm",
    description: "上海市官方法律援助机构，提供免费法律咨询、代理诉讼，涵盖家庭暴力案件",
    descriptionEn: "Shanghai official legal aid — free consultation and litigation support for domestic violence cases.",
    coverage: "上海",
    coverageEn: "Shanghai",
  },
];

export default function LegalPage({ language }: LegalPageProps) {
  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      {/* Header */}
      <div className="text-center pt-2">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Scale className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl font-black text-foreground">
          {copyFor(language, "Legal Aid", "法律援助")}
        </h1>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">
          {copyFor(
            language,
            "Verified non-profit organizations and legal aid centers in China.",
            "中国大陆公益机构与法律援助中心，联系方式经过核实。"
          )}
        </p>
      </div>

      {/* Org cards */}
      <div className="space-y-3 pb-2">
        {ORGS.map((org) => {
          const typeLabel = TYPE_LABEL[org.type];
          return (
            <div
              key={org.id}
              className="rounded-2xl border border-border bg-card p-4"
            >
              {/* Name + type badge */}
              <div className="flex flex-wrap items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold text-foreground leading-snug">
                      {copyFor(language, org.nameEn, org.name)}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeLabel.color}`}
                    >
                      {copyFor(language, typeLabel.en, typeLabel.zh)}
                    </span>
                    <span className="rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {copyFor(language, org.coverageEn, org.coverage)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    {copyFor(language, org.descriptionEn, org.description)}
                  </p>
                </div>
              </div>

              {/* Meta: hours, address */}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" />
                  {copyFor(language, org.hoursEn, org.hours)}
                </span>
                {org.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {copyFor(language, org.addressEn ?? org.address, org.address)}
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-3 flex gap-2">
                {org.phone && (
                  <a
                    href={`tel:${org.phone}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary/10 py-2.5 text-xs font-bold text-primary transition-transform active:scale-95"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {org.phone}
                  </a>
                )}
                {org.websiteUrl && (
                  <a
                    href={org.websiteUrl}
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
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="rounded-2xl border border-border/60 bg-card/40 px-4 py-3 text-xs leading-5 text-muted-foreground pb-4">
        <span className="font-semibold text-foreground/60">
          {copyFor(language, "Note", "提示")}
        </span>
        {"  "}
        {copyFor(
          language,
          "Contact information is verified at the time of listing and updated periodically. If a number is unreachable, try the national hotlines (12338 or 12348) first.",
          "联系方式在收录时经过核实，并定期更新。若某号码无法接通，请优先拨打全国热线 12338 或 12348。"
        )}
      </div>
    </div>
  );
}
