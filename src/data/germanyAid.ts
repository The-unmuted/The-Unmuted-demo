export type GermanyAidCategory = "psych" | "legal" | "social";

export interface GermanyAidResource {
  id: string;
  category: GermanyAidCategory;
  name: string;
  organization: string;
  phone?: string;
  phoneAlt?: string;
  hours: string;
  description: string;
  websiteUrl: string;
  sourceUrl: string;
  tags: string[];
}

/**
 * Nationwide German services checked against the linked primary source on
 * 2026-10-01. Local availability can change; the live finder linked on each
 * directory card remains the source of truth.
 */
export const GERMANY_AID_RESOURCES: GermanyAidResource[] = [
  {
    id: "de-psych-telefonseelsorge",
    category: "psych",
    name: "TelefonSeelsorge Deutschland",
    organization: "TelefonSeelsorge Deutschland",
    phone: "0800 1110111",
    phoneAlt: "0800 1110222 · 116 123",
    hours: "Tag und Nacht, täglich",
    description:
      "Kostenlose und anonyme Krisenbegleitung per Telefon; zusätzlich Chat, E-Mail und Beratung vor Ort. Für schwierige Lebenslagen, Angst, Einsamkeit oder akute seelische Belastung.",
    websiteUrl: "https://www.telefonseelsorge.de/",
    sourceUrl: "https://www.telefonseelsorge.de/",
    tags: ["Krise", "anonym", "kostenlos"],
  },
  {
    id: "de-psych-116117",
    category: "psych",
    name: "Patientenservice 116117",
    organization: "Kassenärztliche Bundesvereinigung",
    phone: "116 117",
    hours: "24 Stunden, 7 Tage",
    description:
      "Ärztlicher Bereitschaftsdienst für dringende, nicht lebensbedrohliche Beschwerden sowie Suche und Terminservice für ärztliche oder psychotherapeutische Praxen. Bei Lebensgefahr gilt 112.",
    websiteUrl: "https://www.116117.de/",
    sourceUrl: "https://www.116117.de/de/index.php",
    tags: ["medizinisch", "Psychotherapie", "bundesweit"],
  },
  {
    id: "de-legal-hilfe-info",
    category: "legal",
    name: "Hilfe-Info · Opferhilfe-Portal",
    organization: "Bundesministerium der Justiz und für Verbraucherschutz",
    hours: "Online jederzeit",
    description:
      "Offizielles Portal zu Strafanzeige, Beweissicherung, Gewaltschutzgesetz, Nebenklage, psychosozialer Prozessbegleitung und Entschädigung. Mit Beratungsstellen-Finder nach Postleitzahl.",
    websiteUrl: "https://www.hilfe-info.de/",
    sourceUrl: "https://www.hilfe-info.de/",
    tags: ["Opferrechte", "Beratungsstellen", "Strafverfahren"],
  },
  {
    id: "de-legal-beratungshilfe",
    category: "legal",
    name: "Beratungshilfe",
    organization: "Justiz-Services des Bundes",
    hours: "Online-Antrag jederzeit; Amtsgericht nach Öffnungszeiten",
    description:
      "Staatlich finanzierte anwaltliche Beratung für Menschen mit wenig Einkommen. Der Beratungshilfeschein kann beim Amtsgericht, per Post, über eine Kanzlei oder online beantragt werden; regelmäßig fällt höchstens eine Gebühr von 15 Euro an.",
    websiteUrl: "https://service.justiz.de/beratungshilfe",
    sourceUrl: "https://service.justiz.de/beratungshilfe",
    tags: ["Anwalt", "geringes Einkommen", "Amtsgericht"],
  },
  {
    id: "de-legal-weisser-ring",
    category: "legal",
    name: "Opfer-Telefon 116 006",
    organization: "WEISSER RING e. V.",
    phone: "116 006",
    hours: "Täglich 07:00–22:00",
    description:
      "Bundesweite, kostenfreie und anonyme Erstberatung nach Straftaten. Geschulte Beratende lotsen zu regionaler Opferhilfe und weiteren passenden Stellen.",
    websiteUrl: "https://weisser-ring.de/hilfe-fuer-opfer/opfer-telefon",
    sourceUrl: "https://weisser-ring.de/hilfe-fuer-opfer/opfer-telefon",
    tags: ["Straftat", "Opferhilfe", "anonym"],
  },
  {
    id: "de-social-hilfetelefon-frauen",
    category: "social",
    name: "Hilfetelefon Gewalt gegen Frauen",
    organization: "Bundesamt für Familie und zivilgesellschaftliche Aufgaben",
    phone: "116 016",
    hours: "365 Tage, rund um die Uhr",
    description:
      "Kostenlose, vertrauliche und anonyme Beratung für betroffene Frauen sowie Angehörige und Fachkräfte. Telefon- und Online-Beratung; Beratung in 18 Fremdsprachen und barrierearme Angebote.",
    websiteUrl: "https://www.hilfetelefon.de/",
    sourceUrl: "https://www.hilfetelefon.de/",
    tags: ["häusliche Gewalt", "18 Sprachen", "24/7"],
  },
  {
    id: "de-social-hilfetelefon-maenner",
    category: "social",
    name: "Hilfetelefon Gewalt an Männern",
    organization: "Hilfetelefon Gewalt an Männern",
    phone: "0800 1239900",
    hours: "Mo–Do 08:00–20:00 · Fr 08:00–15:00",
    description:
      "Anonyme und kostenlose Beratung für Männer, die Gewalt erlebt haben, unter anderem bei häuslicher, sexualisierter, psychischer oder digitaler Gewalt und Stalking. Zusätzlich Text-Chat und Mail-Beratung.",
    websiteUrl: "https://www.maennerhilfetelefon.de/",
    sourceUrl: "https://www.maennerhilfetelefon.de/",
    tags: ["Männer", "Gewalt", "Stalking"],
  },
  {
    id: "de-social-frauenhaus-suche",
    category: "social",
    name: "Bundesweite Frauenhaus-Suche",
    organization: "Zentrale Informationsstelle Autonomer Frauenhäuser",
    hours: "Online jederzeit; Aufnahme telefonisch bestätigen",
    description:
      "Suche nach Frauenhäusern und Schutzwohnungen mit aktuellen Hinweisen zur Aufnahme. Die Kartenpositionen zeigen aus Sicherheitsgründen nicht die tatsächlichen Standorte; die Liste ist nicht vollständig.",
    websiteUrl: "https://www.frauenhaus-suche.de/",
    sourceUrl: "https://www.frauenhaus-suche.de/",
    tags: ["Schutzunterkunft", "Kinder", "freie Plätze"],
  },
  {
    id: "de-social-bff",
    category: "social",
    name: "Fachberatungsstellen vor Ort",
    organization: "bff · Frauen gegen Gewalt e. V.",
    hours: "Online-Suche jederzeit; Stellen nach lokalen Zeiten",
    description:
      "Bundesweite Hilfsdatenbank für Frauennotrufe und Fachberatungsstellen, unter anderem zu sexualisierter, häuslicher und digitaler Gewalt sowie vertraulicher Spurensicherung.",
    websiteUrl: "https://www.frauen-gegen-gewalt.de/de/hilfe-beratung.html",
    sourceUrl: "https://www.frauen-gegen-gewalt.de/de/hilfe-beratung.html",
    tags: ["Fachberatung", "sexualisierte Gewalt", "vor Ort"],
  },
  {
    id: "de-social-bksf",
    category: "social",
    name: "Hilfe bei sexualisierter Gewalt in Kindheit und Jugend",
    organization: "BKSF",
    hours: "Online jederzeit",
    description:
      "Bundesweite Fachinformationen und Zugang zu anonymer, kostenloser Hilfe für Betroffene, Bezugspersonen und Fachkräfte über das Hilfe-Portal Sexueller Missbrauch.",
    websiteUrl: "https://www.bundeskoordinierung.de/",
    sourceUrl: "https://www.bundeskoordinierung.de/",
    tags: ["Kinder", "Jugendliche", "Fachberatung"],
  },
];
