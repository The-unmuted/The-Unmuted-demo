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

// 最后核实时间：2026年6月
const ORGS: LegalOrg[] = [
  {
    id: "1",
    name: "12338全国妇女维权服务热线",
    nameEn: "12338 Women's Rights Hotline",
    type: "hotline",
    phone: "12338",
    hours: "24小时",
    hoursEn: "24 / 7",
    description: "全国妇联体系妇女维权服务热线，可求助家庭暴力、骚扰、歧视与未成年人权益问题",
    descriptionEn: "Women's rights hotline in the All-China Women's Federation system for domestic violence, harassment, discrimination, and child protection issues.",
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
    description: "司法部免费法律咨询热线，可申请指派法律援助律师，覆盖家暴、离婚、人身安全令",
    descriptionEn: "Ministry of Justice free legal hotline. Can request a free appointed lawyer for DV, divorce, and protective orders.",
    coverage: "全国",
    coverageEn: "Nationwide",
  },
  {
    id: "4",
    name: "北京源众家庭与社区发展服务中心",
    nameEn: "Beijing Yuanzhong Family & Community Development Center",
    type: "rights",
    phone: "177-0124-2202",
    website: "bjyuanzhong.org.cn",
    websiteUrl: "https://www.bjyuanzhong.org.cn/",
    address: "北京市朝阳区",
    addressEn: "Chaoyang, Beijing",
    hours: "工作日 9:00 – 17:00",
    hoursEn: "Weekdays 9 am – 5 pm",
    description: "专注性别暴力受害者支持，提供法律援助、心理疏导及个案陪伴服务",
    descriptionEn: "Focused on gender-based violence. Legal aid, counseling, and individual case support.",
    coverage: "全国",
    coverageEn: "Nationwide",
  },
  {
    id: "5",
    name: "番禺区妇联“阳光心晴”心声热线",
    nameEn: "Panyu Women's Federation Support Hotline",
    type: "rights",
    phone: "020-34623861",
    address: "广州市番禺区",
    addressEn: "Panyu, Guangzhou",
    hours: "工作日 9:00 – 17:00",
    hoursEn: "Weekdays 9 am – 5 pm",
    description: "番禺区妇联公开热线，可转介婚姻家事纠纷、家庭暴力、妇女儿童维权与心理支持资源",
    descriptionEn: "Official Panyu Women's Federation hotline for family disputes, domestic violence, women's and children's rights, and referral support.",
    coverage: "广州",
    coverageEn: "Guangzhou",
  },
  {
    id: "6",
    name: "上海市法律援助中心",
    nameEn: "Shanghai Legal Aid Center",
    type: "legal",
    phone: "021-33258152",
    website: "上海12348公共法律服务平台",
    websiteUrl: "https://sh.12348.gov.cn/",
    address: "上海市徐汇区中山西路1538号1002室",
    addressEn: "Room 1002, 1538 Zhongshan West Rd, Xuhui, Shanghai",
    hours: "工作日 9:00 – 17:00",
    hoursEn: "Weekdays 9 am – 5 pm",
    description: "上海市官方法律援助机构。办理窗口电话为 021-33258152，24小时法律咨询可另拨 12348",
    descriptionEn: "Shanghai official legal aid center. Window phone is 021-33258152; for 24/7 legal consultation users can also call 12348.",
    coverage: "上海",
    coverageEn: "Shanghai",
  },
  {
    id: "7",
    name: "深圳12338妇女儿童维权服务",
    nameEn: "Shenzhen 12338 Women's & Children's Rights Service",
    type: "hotline",
    phone: "12345",
    hours: "24小时响应",
    hoursEn: "24-hour response",
    description: "深圳市妇联妇儿维权服务。官方公开信息显示，原“12338”渠道已并入12345市民热线，实现24小时响应",
    descriptionEn: "Women's Federation rights service in Shenzhen. Official notices say the original 12338 channel has been merged into the 12345 city hotline for 24-hour response.",
    coverage: "深圳",
    coverageEn: "Shenzhen",
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
            "Verified non-profit organizations and legal aid centers in China (June 2026).",
            "中国大陆公益机构与法律援助中心，联系方式经核实（2026年6月）。"
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
          {copyFor(language, "Note · 提示", "提示")}
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
