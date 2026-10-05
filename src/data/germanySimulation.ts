export interface GermanySimulationChoice {
  text: string;
  feedback: string;
  flags?: string[];
  next: string;
}

export interface GermanySimulationScene {
  narration: string;
  coach: string;
  choices: GermanySimulationChoice[];
}

export interface GermanySimulationDebrief {
  id: string;
  kind: "good" | "risk";
  flag: string;
  title: string;
  detail: string;
  basis: string;
}

export interface GermanySimulationSource {
  label: string;
  detail: string;
  url: string;
}

export interface GermanySimulationScenario {
  id: string;
  title: string;
  tagline: string;
  entry: string;
  scenes: Record<string, GermanySimulationScene>;
  endings: Record<string, { title: string; summary: string }>;
  debrief: GermanySimulationDebrief[];
  realFlow: string[];
  glossary: Array<{ term: string; note: string }>;
  sources: GermanySimulationSource[];
}

export const GERMANY_DOMESTIC_VIOLENCE_SCENARIO = {
  id: "de-domestic-violence",
  title: "Häusliche Gewalt: sicher handeln",
  tagline:
    "Ein anonymisiertes Kombinationsszenario aus dokumentierten Praxisfällen – mit echten deutschen Hilfswegen und Rechtsgrundlagen.",
  entry: "opening",
  scenes: {
    opening: {
      narration:
        "Häusliche Gewalt kann akut passieren, nach einem Vorfall weiterwirken oder nach einer Trennung in Stalking übergehen. Welche Lage möchtest du üben?",
      coach:
        "Die drei Wege beruhen auf wiederkehrenden Fallmustern aus der Polizeilichen Kriminalprävention und dem staatlichen Opferhilfe-Portal. Es ist kein Bericht über eine einzelne erkennbare Person.",
      choices: [
        {
          text: "Akut: Die Gewalt passiert gerade oder ist eben passiert",
          feedback: "Du beginnst mit der unmittelbaren Sicherheit.",
          flags: ["acute-path"],
          next: "acute-safety",
        },
        {
          text: "Danach: Der Vorfall war gestern oder vor einigen Tagen",
          feedback: "Auch nachträglich können Hilfe, Dokumentation und Schutz möglich sein.",
          flags: ["after-path"],
          next: "after-event",
        },
        {
          text: "Nach der Trennung: Nachrichten, Auflauern oder Drohungen hören nicht auf",
          feedback: "Wiederholtes Nachstellen kann rechtlich relevant sein und Schutzmaßnahmen begründen.",
          flags: ["stalking-path"],
          next: "stalking",
        },
      ],
    },
    "acute-safety": {
      narration:
        "Du bist in der Wohnung. Dein Partner hat dich geschlagen und blockiert den Weg. Ein Kind ist im Nebenzimmer. Dein Telefon ist erreichbar.",
      coach:
        "Bei akuter Bedrohung nennt die Polizei 110 als erste Anlaufstelle. Sicherheit geht vor Beweissicherung. Eine direkte Konfrontation kann die Gefahr erhöhen.",
      choices: [
        {
          text: "In einen abschließbaren Raum gehen, Adresse nennen und 110 anrufen",
          feedback: "Die Leitstelle kennt den Ort. Du bleibst möglichst hinter der verschlossenen Tür.",
          flags: ["reached-safety", "called-police"],
          next: "police-response",
        },
        {
          text: "Wenn möglich zu Nachbar*innen gehen und von dort 110 anrufen",
          feedback: "Du erreichst einen sichereren Ort; die andere Person kann später auch eine Wahrnehmung schildern.",
          flags: ["reached-safety", "called-police", "witness"],
          next: "police-response",
        },
        {
          text: "Versuchen, die Situation allein zu beruhigen und zunächst niemanden rufen",
          feedback: "Das kann eine verständliche Überlebensstrategie sein. Die Gefahr und die Entscheidung liegen nicht in deiner Verantwortung.",
          flags: ["no-emergency-call"],
          next: "acute-delayed",
        },
      ],
    },
    "acute-delayed": {
      narration:
        "Die Situation wird für einen Moment ruhiger. Du kannst jetzt eine Tür erreichen oder eine Nachricht senden.",
      coach:
        "Du kannst auch später noch Hilfe holen. Wenn Telefonieren nicht sicher ist, kann eine Vertrauensperson die Polizei rufen. Das Hilfetelefon 116 016 berät anonym, ersetzt aber bei akuter Gefahr nicht 110.",
      choices: [
        {
          text: "Jetzt Abstand schaffen und 110 anrufen",
          feedback: "Du meldest die akute Lage und nennst die Adresse.",
          flags: ["reached-safety", "called-police"],
          next: "police-response",
        },
        {
          text: "Einer Vertrauensperson den Standort senden und sie um den Notruf bitten",
          feedback: "Eine andere Person weiß nun von der Gefahr und ruft Hilfe.",
          flags: ["reached-safety", "friend-notified", "called-police"],
          next: "police-response",
        },
        {
          text: "Vorerst in der Wohnung bleiben, ohne Sicherheitsplan",
          feedback: "Manchmal fühlt sich keine Option sicher an. Professionelle Beratung kann helfen, einen individuellen Plan zu entwickeln.",
          flags: ["stayed-unsafe"],
          next: "medical",
        },
      ],
    },
    "police-response": {
      narration:
        "Die Polizei kommt. Die Beamt*innen trennen euch und fragen nach dem Ablauf. Welche Schutzmaßnahmen sofort möglich sind, richtet sich auch nach dem Polizeirecht des Bundeslandes.",
      coach:
        "Die Polizei kann eine Person vorübergehend aus der Wohnung verweisen und – je nach Bundesland – ein Rückkehr-, Kontakt- oder Näherungsverbot aussprechen. Es gibt keine bundesweit einheitliche Zahl von Tagen.",
      choices: [
        {
          text: "Den Ablauf vollständig schildern, sichtbare Verletzungen zeigen und nach Aktenzeichen fragen",
          feedback: "Der Einsatz und deine Angaben werden dokumentiert; du notierst das Aktenzeichen.",
          flags: ["police-record", "case-reference"],
          next: "medical",
        },
        {
          text: "Eine Vertrauensperson zur Aussage dazuholen und nach einer Schutzstelle fragen",
          feedback: "Du erhältst eine regionale Vermittlung und bist beim Gespräch nicht allein.",
          flags: ["police-record", "witness", "support-referral"],
          next: "medical",
        },
        {
          text: "Aus Angst nichts weiter sagen und keine Dokumentation ansprechen",
          feedback: "Schweigen unter Druck ist eine häufige Reaktion. Du darfst später erneut Hilfe suchen und weitere Angaben machen.",
          flags: ["no-formal-record"],
          next: "medical",
        },
      ],
    },
    medical: {
      narration:
        "Du hast Schmerzen und sichtbare Verletzungen. Manche Spuren können in den nächsten Tagen abheilen.",
      coach:
        "Die Polizei empfiehlt, ärztliche Hilfe aufzusuchen, den Ursprung der Verletzungen zu benennen und Befunde attestieren sowie fotografisch dokumentieren zu lassen. Bei Lebensgefahr gilt 112; sonst kann 116117 den ärztlichen Bereitschaftsdienst vermitteln.",
      choices: [
        {
          text: "Noch heute medizinische Hilfe suchen und Ursache, Befunde und Fotos dokumentieren lassen",
          feedback: "Es entsteht eine zeitnahe medizinische Dokumentation. Deine Behandlung steht an erster Stelle.",
          flags: ["medical-record"],
          next: "safe-place",
        },
        {
          text: "Selbst Fotos mit Datum sichern und zeitnah einen Arzttermin vereinbaren",
          feedback: "Du sicherst erste Informationen; eine fachliche Untersuchung kann sie ergänzen.",
          flags: ["self-documentation"],
          next: "safe-place",
        },
        {
          text: "Keine Untersuchung und alle Aufnahmen löschen",
          feedback: "Das kann aus Angst oder Überforderung geschehen. Hilfe bleibt trotzdem möglich, auch wenn Belege fehlen.",
          flags: ["no-medical-record", "deleted-evidence"],
          next: "safe-place",
        },
      ],
    },
    "safe-place": {
      narration:
        "Für die nächste Nacht brauchst du einen Ort, an dem die gewaltausübende Person dich nicht erreichen kann.",
      coach:
        "116 016 berät Frauen rund um die Uhr, anonym und in 18 Fremdsprachen. Die Frauenhaus-Suche zeigt Schutzunterkünfte; aus Sicherheitsgründen sind Kartenpositionen nicht die echten Standorte.",
      choices: [
        {
          text: "116 016 anrufen und nach Beratung oder Schutzunterkunft fragen",
          feedback: "Eine Beraterin klärt mit dir, welche regionale Hilfe erreichbar ist.",
          flags: ["used-support-line", "safe-accommodation"],
          next: "family-court",
        },
        {
          text: "Bei einer sicheren Vertrauensperson bleiben und einen Plan für die nächsten Tage machen",
          feedback: "Du bist zunächst nicht allein und kannst weitere Schritte vorbereiten.",
          flags: ["friend-notified", "safe-accommodation"],
          next: "family-court",
        },
        {
          text: "Ohne Sicherheitsplan in die gemeinsame Wohnung zurückkehren",
          feedback: "Die Verantwortung für erneute Gewalt liegt allein bei der gewaltausübenden Person. Beratung kann einen sichereren Rückkehr- oder Auszugsplan unterstützen.",
          flags: ["stayed-unsafe"],
          next: "family-court",
        },
      ],
    },
    "after-event": {
      narration:
        "Der Vorfall liegt einige Tage zurück. Du hast noch Nachrichten, ein beschädigtes Objekt und eine Person, der du kurz danach davon erzählt hast.",
      coach:
        "Spätere Hilfe ist weiterhin möglich. Eine sachliche Chronologie, vollständige Nachrichten, Fotos, medizinische Unterlagen und Zeug*innen können zusammen ein klareres Bild ergeben.",
      choices: [
        {
          text: "Nachrichten vollständig sichern, Ereignisse datieren und die Vertrauensperson notieren",
          feedback: "Du bewahrst Kontext, Zeitpunkte und mögliche Bestätigung durch eine andere Person.",
          flags: ["digital-evidence", "chronology", "witness"],
          next: "after-support",
        },
        {
          text: "Nur einzelne Screenshots ohne Kontext behalten",
          feedback: "Einzelne Bilder können helfen, aber vollständige Verläufe und Originaldateien sind meist besser einzuordnen.",
          flags: ["partial-evidence"],
          next: "after-support",
        },
        {
          text: "Alles löschen, damit niemand es entdeckt",
          feedback: "Sicherheit kann wichtiger sein als Beweise. Wenn möglich, kann eine sichere externe Kopie den Zugriff zu Hause vermeiden.",
          flags: ["deleted-evidence"],
          next: "after-support",
        },
      ],
    },
    "after-support": {
      narration:
        "Du möchtest wissen, welche Schritte jetzt noch möglich sind, ohne sofort alles allein entscheiden zu müssen.",
      coach:
        "116 006 berät Opfer von Straftaten täglich von 7 bis 22 Uhr. Hilfe-Info erklärt Anzeige, Beweissicherung, Prozessbegleitung und regionale Stellen. Beratungshilfe kann anwaltliche Beratung bei geringem Einkommen finanzieren.",
      choices: [
        {
          text: "116 006 anrufen und parallel eine regionale Beratungsstelle suchen",
          feedback: "Du bekommst Orientierung und musst den weiteren Weg nicht allein planen.",
          flags: ["used-victim-support"],
          next: "family-court",
        },
        {
          text: "Beratungshilfe prüfen und eine familienrechtliche Kanzlei suchen",
          feedback: "Du prüfst, ob der Staat die außergerichtliche anwaltliche Beratung finanziert.",
          flags: ["legal-aid"],
          next: "family-court",
        },
        {
          text: "Noch nichts entscheiden, aber sichere Kopien behalten",
          feedback: "Du erhältst dir Handlungsmöglichkeiten. Du kannst später wieder anknüpfen.",
          flags: ["chronology"],
          next: "family-court",
        },
      ],
    },
    "family-court": {
      narration:
        "Du möchtest längerfristig verhindern, dass die Person die Wohnung betritt, Kontakt aufnimmt oder sich dir nähert.",
      coach:
        "Nach § 1 GewSchG kann das Familiengericht unter anderem Betretungs-, Näherungs- und Kontaktverbote anordnen. § 2 regelt die zeitweise Überlassung der gemeinsam genutzten Wohnung. Ein Verstoß gegen eine gerichtliche Schutzanordnung kann nach § 4 strafbar sein.",
      choices: [
        {
          text: "Beim Familiengericht eine einstweilige Schutzanordnung nach dem Gewaltschutzgesetz prüfen",
          feedback: "Du bereitest Ereignisse und vorhandene Unterlagen für den Antrag vor.",
          flags: ["protection-order"],
          next: "end:protected",
        },
        {
          text: "Zuerst mit Beratungsstelle oder Anwält*in den Antrag und die Sicherheit planen",
          feedback: "Du lässt dir bei Antrag, Nachweisen und einem individuellen Sicherheitsplan helfen.",
          flags: ["professional-support", "protection-order"],
          next: "end:supported",
        },
        {
          text: "Vorerst keinen Antrag stellen und keine Beratung nutzen",
          feedback: "Diese Entscheidung kann viele Gründe haben. Die Hilfsangebote bleiben später nutzbar.",
          flags: ["no-protection-step"],
          next: "end:open",
        },
      ],
    },
    stalking: {
      narration:
        "Nach der Trennung kommen täglich Nachrichten. Die Person wartet vor der Arbeit und droht, private Bilder zu verbreiten.",
      coach:
        "Wiederholtes Aufsuchen, Kontaktversuche, Drohungen und bestimmte digitale Handlungen können Nachstellung nach § 238 StGB sein. § 1 GewSchG kann zusätzlich Kontakt- und Näherungsverbote ermöglichen.",
      choices: [
        {
          text: "Nachrichten und Vorfälle vollständig sichern, nicht allein treffen und bei Drohung 110 rufen",
          feedback: "Du sicherst den Verlauf und vermeidest ein Treffen ohne Schutz.",
          flags: ["digital-evidence", "chronology", "reached-safety"],
          next: "stalking-action",
        },
        {
          text: "Nummer sofort wechseln und vorher alle Nachrichten löschen",
          feedback: "Abstand kann entlasten; vorherige sichere Sicherung könnte spätere Schritte erleichtern.",
          flags: ["deleted-evidence", "evading-only"],
          next: "stalking-action",
        },
        {
          text: "Allein zu einem klärenden Treffen gehen",
          feedback: "Ein persönliches Treffen kann die Gefahr erhöhen. Eine Fachstelle kann sichere Alternativen planen.",
          flags: ["unsafe-meeting"],
          next: "stalking-action",
        },
      ],
    },
    "stalking-action": {
      narration:
        "Die Kontaktversuche gehen weiter. Du möchtest eine verbindliche Grenze und Unterstützung vor Ort.",
      coach:
        "Das Familiengericht kann Schutzanordnungen treffen; die Polizei kann bei aktueller Gefahr handeln. Hilfe-Info und Fachberatungsstellen erklären das Verfahren und regionale Angebote.",
      choices: [
        {
          text: "Polizei und Beratungsstelle einbeziehen und eine Schutzanordnung prüfen",
          feedback: "Du verbindest akuten Schutz, Dokumentation und zivilrechtliche Schritte.",
          flags: ["police-record", "professional-support", "protection-order"],
          next: "end:protected",
        },
        {
          text: "Nur blockieren, aber sichere Dokumentation behalten",
          feedback: "Blockieren kann Ruhe schaffen; die gesicherten Unterlagen lassen weitere Wege offen.",
          flags: ["digital-evidence", "partial-protection"],
          next: "end:open",
        },
        {
          text: "Nichts dokumentieren und auf ein Ende der Kontakte hoffen",
          feedback: "Hoffnung ist verständlich. Bei neuer Drohung oder Annäherung darfst du jederzeit 110 rufen.",
          flags: ["no-protection-step"],
          next: "end:open",
        },
      ],
    },
  } satisfies Record<string, GermanySimulationScene>,
  endings: {
    protected: {
      title: "Schutzwege miteinander verbunden",
      summary:
        "Du hast unmittelbare Sicherheit, dokumentierte Hilfe und längerfristigen Schutz zusammengedacht. Welche Maßnahme im Einzelfall passt, sollte eine Fachstelle oder anwaltliche Beratung prüfen.",
    },
    supported: {
      title: "Professionelle Begleitung aufgebaut",
      summary:
        "Du hast den nächsten Schritt nicht allein geplant. Beratung kann Schutz, Antrag, Kinder, Wohnen und finanzielle Fragen gemeinsam betrachten.",
    },
    open: {
      title: "Handlungsmöglichkeiten bleiben offen",
      summary:
        "Nicht jeder Schritt ist sofort möglich oder sicher. Du kannst später erneut Hilfe holen; fehlende Belege nehmen dir nicht das Recht auf Beratung und Schutz.",
    },
  },
  debrief: [
    {
      id: "safe-first",
      kind: "good",
      flag: "reached-safety",
      title: "Sicherheit zuerst",
      detail: "Du hast Abstand zur akuten Gefahr geschaffen, bevor du weitere Schritte geplant hast.",
      basis: "Polizeiliche Kriminalprävention: bei akuter Bedrohung 110 wählen.",
    },
    {
      id: "police-documentation",
      kind: "good",
      flag: "police-record",
      title: "Polizeiliche Dokumentation",
      detail: "Ein dokumentierter Einsatz und ein Aktenzeichen können spätere Schutz- und Strafverfahren unterstützen.",
      basis: "Polizeiliche Kriminalprävention · Hilfe-Info des BMJV.",
    },
    {
      id: "medical-documentation",
      kind: "good",
      flag: "medical-record",
      title: "Zeitnahe medizinische Dokumentation",
      detail: "Behandlung, Befund, Ursache und Fotos wurden professionell und zeitnah festgehalten.",
      basis: "Offizielle Polizeiberatung zu häuslicher Gewalt.",
    },
    {
      id: "digital-evidence",
      kind: "good",
      flag: "digital-evidence",
      title: "Kontext statt einzelner Screenshots",
      detail: "Vollständige Verläufe, Originaldateien und eine Chronologie machen wiederholte Kontakte nachvollziehbarer.",
      basis: "§ 238 StGB (Nachstellung) und Hilfe-Info zur Beweissicherung.",
    },
    {
      id: "support",
      kind: "good",
      flag: "professional-support",
      title: "Fachliche Begleitung",
      detail: "Beratung kann rechtliche Schritte mit einem individuellen Sicherheitsplan verbinden.",
      basis: "Hilfe-Info; bundesweite Fachberatungsstellen und Opferhilfe.",
    },
    {
      id: "protection-order",
      kind: "good",
      flag: "protection-order",
      title: "Gerichtlichen Schutz geprüft",
      detail: "Kontakt-, Näherungs- und Betretungsverbote können beim Familiengericht beantragt werden.",
      basis: "§§ 1 und 2 Gewaltschutzgesetz.",
    },
    {
      id: "no-emergency-call",
      kind: "risk",
      flag: "no-emergency-call",
      title: "Keine Hilfe während der akuten Gefahr",
      detail: "Allein zu deeskalieren kann eine Überlebensreaktion sein. Wenn es sicher möglich wird, kann 110 oder eine Vertrauensperson Unterstützung holen.",
      basis: "Polizeiliche Kriminalprävention; keine Schuldzuweisung an Betroffene.",
    },
    {
      id: "deleted-evidence",
      kind: "risk",
      flag: "deleted-evidence",
      title: "Unterlagen gelöscht",
      detail: "Sicherheit ist wichtiger als Belege. Wenn möglich, kann eine verschlüsselte oder externe Kopie verhindern, dass Material zu Hause auffindbar bleibt.",
      basis: "Hilfe-Info zur Beweissicherung.",
    },
    {
      id: "unsafe-meeting",
      kind: "risk",
      flag: "unsafe-meeting",
      title: "Treffen ohne Schutz",
      detail: "Ein klärendes Treffen kann die Lage verschärfen. Fachberatung kann sichere Kommunikationswege und Begleitung planen.",
      basis: "Polizeiliche Präventionshinweise zu Stalking und häuslicher Gewalt.",
    },
    {
      id: "no-protection-step",
      kind: "risk",
      flag: "no-protection-step",
      title: "Noch kein Schutzschritt",
      detail: "Du kannst Beratung oder einen Antrag auch später beginnen. Bei akuter Gefahr bleibt 110 jederzeit möglich.",
      basis: "Gewaltschutzgesetz und bundesweite Opferhilfe-Angebote.",
    },
  ] satisfies GermanySimulationDebrief[],
  realFlow: [
    "Akute Sicherheit herstellen; bei unmittelbarer Gefahr Polizei 110 oder Rettungsdienst 112 rufen.",
    "Polizeilichen Einsatz, Aktenzeichen, Verletzungen, Nachrichten und mögliche Zeug*innen dokumentieren.",
    "Medizinische Behandlung und – wenn gewünscht – zeitnahe Befunddokumentation nutzen.",
    "Über 116 016, 116 006 oder eine Fachberatungsstelle Schutzunterkunft und Sicherheitsplan klären.",
    "Beim Familiengericht Schutzanordnung und Wohnungsüberlassung nach dem Gewaltschutzgesetz prüfen.",
    "Bei geringem Einkommen Beratungshilfe und bei einem Strafverfahren psychosoziale Prozessbegleitung prüfen.",
  ],
  glossary: [
    {
      term: "Schutzanordnung",
      note: "Gerichtliche Anordnung nach § 1 GewSchG, zum Beispiel Kontakt-, Näherungs- oder Betretungsverbot.",
    },
    {
      term: "Wohnungsüberlassung",
      note: "§ 2 GewSchG kann unter Voraussetzungen die zeitweise alleinige Nutzung der gemeinsam bewohnten Wohnung ermöglichen.",
    },
    {
      term: "Beratungshilfe",
      note: "Staatliche Finanzierung außergerichtlicher anwaltlicher Beratung bei geringem Einkommen; regelmäßig höchstens 15 Euro Eigenanteil.",
    },
    {
      term: "Psychosoziale Prozessbegleitung",
      note: "Professionelle Begleitung vor, während und nach einem Strafverfahren; in bestimmten Fällen kann das Gericht sie kostenfrei beiordnen (§ 406g StPO).",
    },
  ],
  sources: [
    {
      label: "Polizeiliche Kriminalprävention · Häusliche Gewalt",
      detail: "110, Anzeige, Dokumentation, ärztliche Befunde, Wohnungsverweisung und zivilrechtlicher Schutz.",
      url: "https://www.polizei-beratung.de/infos-fuer-betroffene/haeusliche-gewalt/",
    },
    {
      label: "Gewaltschutzgesetz (GewSchG)",
      detail: "§ 1 Schutzmaßnahmen, § 2 Wohnungsüberlassung, § 4 Strafbarkeit von Verstößen.",
      url: "https://www.gesetze-im-internet.de/gewschg/",
    },
    {
      label: "§ 238 StGB · Nachstellung",
      detail: "Wiederholte Annäherung, Kontaktversuche, Drohungen und bestimmte digitale Handlungen.",
      url: "https://www.gesetze-im-internet.de/stgb/__238.html",
    },
    {
      label: "Hilfe-Info · Bundesministerium der Justiz",
      detail: "Opferrechte, Strafanzeige, Beweissicherung, Prozessbegleitung und Beratungsstellen-Finder.",
      url: "https://www.hilfe-info.de/",
    },
    {
      label: "§ 406g StPO · Psychosoziale Prozessbegleitung",
      detail: "Anwesenheit und gerichtliche Beiordnung der Prozessbegleitung in bestimmten Fällen.",
      url: "https://www.gesetze-im-internet.de/stpo/__406g.html",
    },
  ] satisfies GermanySimulationSource[],
};

export type GermanyDomesticViolenceScenario = typeof GERMANY_DOMESTIC_VIOLENCE_SCENARIO;

/**
 * A non-graphic German scenario about sexualised violence after an assault.
 * It focuses on safety, confidential forensic preservation, medical care,
 * reporting choices and support — never on depicting the assault itself.
 */
export const GERMANY_SEXUAL_ASSAULT_SCENARIO: GermanySimulationScenario = {
  id: "de-sexual-assault",
  title: "Sexualisierte Gewalt: Hilfe und Spuren sichern",
  tagline:
    "Ein nicht-grafisches Übungsszenario nach sexualisierter Gewalt oder Vergewaltigung – mit deutschen Hilfswegen, vertraulicher Spurensicherung und rechtlichen Optionen.",
  entry: "opening",
  scenes: {
    opening: {
      narration:
        "Ein Übergriff ist vorbei. Vielleicht gab es nach einem Treffen eine Erinnerungslücke, eine Person hat deinen Willen missachtet oder du bemerkst die Folgen erst später. Du bist jetzt an einem sicheren Ort.",
      coach:
        "Die Übung beschreibt nicht den Übergriff selbst. Sie orientiert sich an offiziellen deutschen Informationen zu medizinischer Hilfe, vertraulicher Spurensicherung und Opferrechten.",
      choices: [
        {
          text: "Nach einem Treffen mit Erinnerungslücke: sicheren Ort suchen und medizinische Hilfe erwägen",
          feedback: "Deine unmittelbare Sicherheit und Unterstützung kommen zuerst.",
          flags: ["reached-safety", "friend-notified"],
          next: "first-care",
        },
        {
          text: "Nach einer Vergewaltigung oder anderem erzwungenem Kontakt: 112 oder eine Notaufnahme wählen, wenn es dringend ist",
          feedback: "Bei akuter Verletzung oder Lebensgefahr ist medizinische Hilfe wichtiger als Beweissicherung.",
          flags: ["medical-urgent", "reached-safety"],
          next: "first-care",
        },
        {
          text: "Der Vorfall liegt Tage zurück: eine Beratungsstelle kontaktieren und die Entscheidung offenlassen",
          feedback: "Auch nach Tagen ist Unterstützung möglich. Du darfst in deinem Tempo entscheiden.",
          flags: ["delayed-support", "reached-safety"],
          next: "first-care",
        },
        {
          text: "Allein bleiben und versuchen, alles sofort zu vergessen",
          feedback: "Rückzug kann eine verständliche Reaktion sein. Du darfst später jederzeit Unterstützung holen.",
          flags: ["isolated"],
          next: "first-care",
        },
      ],
    },
    "first-care": {
      narration:
        "Du überlegst, ob du medizinische Hilfe und eine vertrauliche Untersuchung möchtest. Vielleicht weißt du noch nicht, ob du Anzeige erstatten willst.",
      coach:
        "In Deutschland kann eine vertrauliche Spurensicherung je nach Bundesland und Klinik auch ohne sofortige Anzeige möglich sein. Frage nach lokalen Angeboten; Verfügbarkeit und Aufbewahrungsdauer unterscheiden sich.",
      choices: [
        {
          text: "Bei Erinnerungslücke oder Verdacht auf K.-o.-Mittel nach zeitnaher Urin- oder Blutuntersuchung fragen",
          feedback: "Du fragst nach einer medizinischen Einschätzung; Nachweisbarkeit hängt vom Stoff und vom Zeitpunkt ab.",
          flags: ["drugging-medical", "medical-record"],
          next: "evidence-choice",
        },
        {
          text: "Eine Klinik oder Fachberatungsstelle nach vertraulicher Spurensicherung fragen",
          feedback: "Du hältst eine spätere Entscheidung offen und klärst, welche Untersuchung vor Ort möglich ist.",
          flags: ["confidential-exam", "professional-support"],
          next: "evidence-choice",
        },
        {
          text: "Zeitnah ärztliche Hilfe suchen und Beschwerden dokumentieren lassen",
          feedback: "Behandlung und medizinische Dokumentation stehen im Vordergrund; du musst keine Anzeige versprechen.",
          flags: ["medical-record"],
          next: "evidence-choice",
        },
        {
          text: "Noch keine Untersuchung, aber später eine Beratungsstelle kontaktieren",
          feedback: "Auch eine spätere Beratung ist möglich. Fehlende Spuren nehmen dir nicht das Recht auf Hilfe.",
          flags: ["delayed-support"],
          next: "evidence-choice",
        },
      ],
    },
    "evidence-choice": {
      narration:
        "Du möchtest deine Entscheidung selbst treffen. Kleidung, Nachrichten, Fotos und eine kurze Chronologie könnten später wichtig sein.",
      coach:
        "Wenn es für dich sicher und zumutbar ist, bewahre mögliche Beweismittel getrennt auf und sichere Nachrichten im vollständigen Zusammenhang. Was du nicht tun kannst, ist kein Versagen.",
      choices: [
        {
          text: "Kleidung und andere mögliche Spuren getrennt aufbewahren und Nachrichten vollständig sichern",
          feedback: "Du bewahrst mögliche Spuren und digitalen Kontext, ohne dich selbst zu gefährden.",
          flags: ["preserved-evidence", "digital-evidence"],
          next: "reporting",
        },
        {
          text: "Nur eine sachliche Chronologie schreiben und Dateien auf einem sicheren Gerät sichern",
          feedback: "Eine zeitnahe, eigene Notiz kann Erinnerungen und spätere Gespräche strukturieren.",
          flags: ["chronology", "digital-evidence"],
          next: "reporting",
        },
        {
          text: "Alles löschen, damit niemand etwas findet",
          feedback: "Sicherheit kann wichtiger sein als Belege. Wenn möglich, plane mit einer Fachstelle eine sichere Aufbewahrung.",
          flags: ["deleted-evidence"],
          next: "reporting",
        },
      ],
    },
    reporting: {
      narration:
        "Du fragst dich, ob und wann du zur Polizei gehen willst. Eine Anzeige kann später möglich sein; du darfst dir vorher Unterstützung holen.",
      coach:
        "Die Polizei muss eine Strafanzeige aufnehmen. Eine Fachberatungsstelle oder psychosoziale Prozessbegleitung kann dich auf ein Gespräch vorbereiten. Bei akuter Gefahr gilt 110.",
      choices: [
        {
          text: "Mit einer Fachberatungsstelle sprechen und dann eine Anzeige erwägen",
          feedback: "Du verbindest deine eigene Entscheidung mit professioneller Begleitung.",
          flags: ["professional-support", "reporting-option"],
          next: "support-path",
        },
        {
          text: "Anzeige erstatten, eine Vorgangsnummer erfragen und eine Vertrauensperson mitnehmen",
          feedback: "Du schaffst einen offiziellen Anknüpfungspunkt und bleibst im Gespräch nicht allein.",
          flags: ["police-record", "case-reference", "friend-notified"],
          next: "support-path",
        },
        {
          text: "Jetzt noch keine Anzeige erstatten und die Entscheidung offenlassen",
          feedback: "Eine verzögerte Entscheidung ist möglich. Du kannst später erneut Beratung oder die Polizei kontaktieren.",
          flags: ["delayed-report"],
          next: "support-path",
        },
      ],
    },
    "support-path": {
      narration:
        "Nach dem ersten Schritt brauchst du Unterstützung, die zu dir passt: medizinisch, psychologisch, sozial oder rechtlich.",
      coach:
        "Das Hilfetelefon Gewalt gegen Frauen (116 016), der WEISSE RING (116 006) und lokale Fachberatungsstellen können weitervermitteln. TelefonSeelsorge ist bei seelischer Überlastung erreichbar.",
      choices: [
        {
          text: "116 016 oder eine lokale Fachberatungsstelle kontaktieren",
          feedback: "Du erhältst vertrauliche Orientierung und kannst weitere Schritte in deinem Tempo planen.",
          flags: ["professional-support", "used-support-line"],
          next: "end:supported",
        },
        {
          text: "116 006 anrufen und nach Opferhilfe oder psychosozialer Prozessbegleitung fragen",
          feedback: "Du nutzt eine bundesweite Opferhilfe, die zu regionalen Angeboten lotsen kann.",
          flags: ["victim-support", "professional-support"],
          next: "end:supported",
        },
        {
          text: "Vorerst nur eine sichere Vertrauensperson einbeziehen",
          feedback: "Du musst nicht alle Angebote auf einmal nutzen. Ein kleiner sicherer Schritt zählt.",
          flags: ["friend-notified"],
          next: "end:open",
        },
      ],
    },
  },
  endings: {
    supported: {
      title: "Unterstützung und Optionen gesichert",
      summary:
        "Du hast Sicherheit, medizinische oder vertrauliche Hilfe, eigene Entscheidungen und weitere Beratungswege miteinander verbunden.",
    },
    open: {
      title: "Deine Entscheidung bleibt offen",
      summary:
        "Du musst dich nicht sofort festlegen. Sichere Unterstützung ist weiterhin möglich, auch wenn du heute keine Anzeige erstattest.",
    },
  },
  debrief: [
    {
      id: "safety",
      kind: "good",
      flag: "reached-safety",
      title: "Sicherheit zuerst",
      detail: "Du hast einen sicheren Ort oder medizinische Hilfe als ersten Schritt gewählt.",
      basis: "Polizeiliche Kriminalprävention und Hilfe-Info: akute Gefahr vor Beweissicherung.",
    },
    {
      id: "confidential-exam",
      kind: "good",
      flag: "confidential-exam",
      title: "Vertrauliche Spurensicherung geprüft",
      detail: "Du hast nach einer Untersuchung gefragt, ohne eine sofortige Anzeige vorauszusetzen.",
      basis: "Hilfe-Info und lokale Angebote zur vertraulichen Spurensicherung.",
    },
    {
      id: "medical-record",
      kind: "good",
      flag: "medical-record",
      title: "Medizinische Hilfe dokumentiert",
      detail: "Du hast Behandlung und zeitnahe Dokumentation der Beschwerden priorisiert.",
      basis: "Hilfe-Info: medizinische Versorgung und Dokumentation nach sexualisierter Gewalt.",
    },
    {
      id: "drugging-medical",
      kind: "good",
      flag: "drugging-medical",
      title: "Verdacht auf K.-o.-Mittel medizinisch angesprochen",
      detail: "Du hast eine Erinnerungslücke oder einen möglichen Substanzkontakt als medizinisches Thema angesprochen, ohne eine Diagnose vorwegzunehmen.",
      basis: "Hilfe-Info und medizinische Fachberatung; Nachweisbarkeit hängt vom Stoff und Zeitpunkt ab.",
    },
    {
      id: "preserved-evidence",
      kind: "good",
      flag: "preserved-evidence",
      title: "Mögliche Spuren sicher aufbewahrt",
      detail: "Du hast mögliche Beweismittel getrennt aufbewahrt, ohne deine Sicherheit zu gefährden.",
      basis: "Polizeiliche Kriminalprävention und Hilfe-Info zur Beweissicherung.",
    },
    {
      id: "support",
      kind: "good",
      flag: "professional-support",
      title: "Fachliche Begleitung einbezogen",
      detail: "Du hast eine Fachberatungsstelle oder Opferhilfe als nächsten Schritt genutzt.",
      basis: "Hilfetelefon 116 016, WEISSER RING 116 006 und Hilfe-Info.",
    },
    {
      id: "police-record",
      kind: "good",
      flag: "police-record",
      title: "Anzeigeoption bewusst genutzt",
      detail: "Du hast eine Strafanzeige und eine Vorgangsnummer als mögliche nächste Schritte eingeordnet.",
      basis: "§§ 158, 160 StPO und Polizei-Informationen zur Strafanzeige.",
    },
    {
      id: "deleted",
      kind: "risk",
      flag: "deleted-evidence",
      title: "Mögliche Unterlagen gelöscht",
      detail: "Sicherheit kann ein Grund dafür sein. Wenn möglich, kann eine Fachstelle eine sichere Aufbewahrung mit dir planen.",
      basis: "Hilfe-Info zur Beweissicherung; keine Schuldzuweisung.",
    },
    {
      id: "isolated",
      kind: "risk",
      flag: "isolated",
      title: "Allein geblieben",
      detail: "Rückzug ist eine mögliche Reaktion. Eine Vertrauensperson oder Fachstelle kann später Unterstützung geben.",
      basis: "Hilfe-Info und Beratungsangebote nach sexualisierter Gewalt.",
    },
  ],
  realFlow: [
    "Sicheren Ort herstellen; bei akuter Gefahr 110, bei medizinischem Notfall 112 wählen.",
    "Medizinische Hilfe und – je nach Region – vertrauliche Spurensicherung ohne sofortige Anzeige erfragen.",
    "Wenn sicher und zumutbar: mögliche Spuren getrennt aufbewahren, Nachrichten vollständig sichern und eine Chronologie schreiben.",
    "Mit einer Fachberatungsstelle, 116 016 oder 116 006 die eigenen Optionen und regionale Angebote besprechen.",
    "Eine Strafanzeige kann bei Polizei oder Staatsanwaltschaft erstattet werden; eine Vertrauensperson darf unterstützen.",
    "Bei einem Strafverfahren nach psychosozialer Prozessbegleitung und anwaltlicher Beratung fragen.",
  ],
  glossary: [
    {
      term: "Vertrauliche Spurensicherung",
      note: "Medizinische Untersuchung und Sicherung möglicher Spuren, die je nach Bundesland und Einrichtung auch ohne sofortige Anzeige angeboten werden kann.",
    },
    {
      term: "Strafanzeige",
      note: "Mitteilung eines möglichen Delikts an Polizei oder Staatsanwaltschaft. Die Entscheidung über Ermittlungen liegt nicht bei der betroffenen Person.",
    },
    {
      term: "§ 177 StGB",
      note: "Regelt sexuellen Übergriff, sexuelle Nötigung und Vergewaltigung. Die genaue rechtliche Einordnung hängt von den konkreten Umständen ab und sollte nicht durch die App ersetzt werden.",
    },
    {
      term: "Psychosoziale Prozessbegleitung",
      note: "Professionelle, nicht-rechtliche Begleitung vor und während eines Strafverfahrens; in bestimmten Fällen kann sie beigeordnet werden (§ 406g StPO).",
    },
    {
      term: "Opferhilfe",
      note: "Beratung, Begleitung und Weitervermittlung durch Fachstellen; sie ersetzt weder Notruf noch individuelle Rechtsberatung.",
    },
  ],
  sources: [
    {
      label: "Hilfe-Info · Sexualisierte Gewalt",
      detail: "Offizielles Portal zu Anzeige, Beweissicherung, medizinischer Versorgung, Opferrechten und Beratung.",
      url: "https://www.hilfe-info.de/",
    },
    {
      label: "Polizeiliche Kriminalprävention · Sexualisierte Gewalt",
      detail: "Sicherheit, Anzeige, Beweissicherung und Informationen für Betroffene.",
      url: "https://www.polizei-beratung.de/themen-und-tipps/sexualdelikte/",
    },
    {
      label: "Hilfetelefon Gewalt gegen Frauen · 116 016",
      detail: "Kostenlose, vertrauliche und anonyme Beratung rund um die Uhr.",
      url: "https://www.hilfetelefon.de/",
    },
    {
      label: "WEISSER RING · Opfer-Telefon 116 006",
      detail: "Bundesweite Opferhilfe und Vermittlung zu regionalen Stellen.",
      url: "https://weisser-ring.de/hilfe/" ,
    },
    {
      label: "§ 406g StPO · Psychosoziale Prozessbegleitung",
      detail: "Gesetzliche Grundlage für psychosoziale Prozessbegleitung in bestimmten Strafverfahren.",
      url: "https://www.gesetze-im-internet.de/stpo/__406g.html",
    },
    {
      label: "§ 177 StGB · Sexueller Übergriff, sexuelle Nötigung, Vergewaltigung",
      detail: "Offizielle Gesetzesfassung; die konkrete Einordnung eines Falls erfolgt durch Polizei, Staatsanwaltschaft und Gericht.",
      url: "https://www.gesetze-im-internet.de/stgb/__177.html",
    },
    {
      label: "§§ 158 und 160 StPO · Strafanzeige und Ermittlungsverfahren",
      detail: "Offizielle Grundlagen zur Anzeige bei Polizei oder Staatsanwaltschaft und zum Ermittlungsverfahren.",
      url: "https://www.gesetze-im-internet.de/stpo/__158.html",
    },
  ],
};

/** A separate, non-graphic workplace sexual-harassment practice path. */
export const GERMANY_SEXUAL_HARASSMENT_SCENARIO: GermanySimulationScenario = {
  id: "de-sexual-harassment",
  title: "Sexuelle Belästigung: Grenzen und Unterstützung",
  tagline:
    "Ein Übungsszenario zu sexualisierten Nachrichten, Berührungen und Machtgefällen am Arbeitsplatz – mit sicheren Dokumentations- und Beschwerdewegen.",
  entry: "opening",
  scenes: {
    opening: {
      narration:
        "Eine Person im Arbeitsumfeld macht wiederholt sexualisierte Kommentare und schreibt dir Nachrichten. Du möchtest, dass es aufhört, ohne dich unnötig zu gefährden.",
      coach:
        "Sexuelle Belästigung kann verbal, digital oder körperlich sein. Du bist nicht verpflichtet, die Person allein zur Rede zu stellen.",
      choices: [
        {
          text: "Sicheren Abstand schaffen und einer Vertrauensperson davon erzählen",
          feedback: "Du holst Unterstützung, bevor du weitere Schritte planst.",
          flags: ["reached-safety", "friend-notified"],
          next: "document",
        },
        {
          text: "Die Nachrichten und Vorfälle mit Datum, Ort und möglichen Zeug*innen sichern",
          feedback: "Du hältst den Zusammenhang fest, ohne die Verantwortung für das Verhalten der anderen Person zu übernehmen.",
          flags: ["digital-evidence", "chronology"],
          next: "document",
        },
        {
          text: "Allein ein klärendes Treffen in einem privaten Raum vereinbaren",
          feedback: "Ein privates Treffen kann das Machtgefälle vergrößern. Eine sichere, begleitete Lösung ist oft besser.",
          flags: ["unsafe-meeting"],
          next: "document",
        },
      ],
    },
    document: {
      narration:
        "Du überlegst, wie du reagieren kannst. Die Person ist möglicherweise vorgesetzt oder beeinflusst deine Arbeitsbedingungen.",
      coach:
        "Unternehmen müssen Beschwerden nach dem Allgemeinen Gleichbehandlungsgesetz ernst nehmen und Schutzmaßnahmen prüfen. Interne Beschwerdestellen, Betriebsrat oder externe Beratung können Optionen erklären.",
      choices: [
        {
          text: "Eine schriftliche Beschwerde an die zuständige Beschwerdestelle oder den Betriebsrat richten",
          feedback: "Du schaffst einen nachvollziehbaren internen Vorgang und bittest um Schutzmaßnahmen.",
          flags: ["formal-complaint", "professional-support"],
          next: "response",
        },
        {
          text: "Zuerst anonym bei der Antidiskriminierungsstelle oder einer Fachberatung fragen",
          feedback: "Du klärst deine Rechte und mögliche Risiken, bevor du dich festlegst.",
          flags: ["professional-support"],
          next: "response",
        },
        {
          text: "Die Nachrichten löschen und niemandem davon erzählen",
          feedback: "Schweigen kann sich kurzfristig sicherer anfühlen. Wenn möglich, bewahre eine sichere Kopie auf und hole dir Unterstützung.",
          flags: ["deleted-evidence", "isolated"],
          next: "response",
        },
      ],
    },
    response: {
      narration:
        "Du hast einen nächsten Schritt gewählt. Jetzt geht es darum, Grenzen, Schutz und mögliche weitere Verfahren zu planen.",
      coach:
        "Eine Beschwerde ersetzt keinen Notruf. Bei Drohungen, Übergriffen oder akuter Gefahr kannst du 110 rufen. Rechtliche Beratung kann die passende Strategie prüfen.",
      choices: [
        {
          text: "Schriftliche Antwort, Schutz vor weiterer Kontaktaufnahme und eine Begleitperson verlangen",
          feedback: "Du formulierst konkrete Schutzbedürfnisse und bleibst nicht allein.",
          flags: ["protective-measures", "professional-support"],
          next: "end:supported",
        },
        {
          text: "Bei körperlichem Übergriff oder Drohung die Polizei einschalten und ärztliche Hilfe suchen",
          feedback: "Du behandelst eine mögliche Straftat als Sicherheits- und Gesundheitsfrage.",
          flags: ["police-record", "medical-record"],
          next: "end:supported",
        },
        {
          text: "Noch keine formelle Beschwerde, aber sichere Kopien behalten und Beratung offenlassen",
          feedback: "Du hältst dir Optionen offen. Eine spätere Beratung ist weiterhin möglich.",
          flags: ["digital-evidence"],
          next: "end:open",
        },
      ],
    },
  },
  endings: {
    supported: {
      title: "Grenzen und Schutzwege geklärt",
      summary: "Du hast Dokumentation, Unterstützung und konkrete Schutzoptionen miteinander verbunden.",
    },
    open: {
      title: "Optionen bleiben offen",
      summary: "Du musst dich nicht sofort festlegen. Sichere Kopien und Beratung können spätere Schritte erleichtern.",
    },
  },
  debrief: [
    {
      id: "work-documentation",
      kind: "good",
      flag: "digital-evidence",
      title: "Nachrichten und Kontext gesichert",
      detail: "Du hast Originalnachrichten, Daten und den Zusammenhang bewahrt.",
      basis: "Antidiskriminierungsstelle des Bundes: Beratung und Dokumentation.",
    },
    {
      id: "formal-complaint",
      kind: "good",
      flag: "formal-complaint",
      title: "Beschwerdeweg genutzt",
      detail: "Du hast eine zuständige Beschwerdestelle oder Interessenvertretung einbezogen.",
      basis: "§ 13 AGG: Beschwerderecht im Arbeitsleben.",
    },
    {
      id: "work-support",
      kind: "good",
      flag: "professional-support",
      title: "Beratung hinzugezogen",
      detail: "Du hast Rechte und Schutzmaßnahmen mit einer Fachstelle eingeordnet.",
      basis: "Antidiskriminierungsstelle des Bundes und Hilfe-Info.",
    },
    {
      id: "protective-measures",
      kind: "good",
      flag: "protective-measures",
      title: "Konkreten Schutz verlangt",
      detail: "Du hast nicht nur ein Ende des Verhaltens, sondern konkrete Schutzmaßnahmen angesprochen.",
      basis: "§§ 12 und 14 AGG: Schutz- und Unterstützungsmaßnahmen.",
    },
    {
      id: "work-police",
      kind: "good",
      flag: "police-record",
      title: "Akute Gefahr ernst genommen",
      detail: "Bei Drohung oder körperlichem Übergriff hast du Polizei oder medizinische Hilfe einbezogen.",
      basis: "Polizei 110 und medizinischer Notruf 112.",
    },
    {
      id: "work-deleted",
      kind: "risk",
      flag: "deleted-evidence",
      title: "Nachrichten gelöscht",
      detail: "Wenn es sicher ist, bewahre eine Kopie außerhalb des Arbeitsgeräts auf. Die Verantwortung für Belästigung liegt nicht bei dir.",
      basis: "Antidiskriminierungsstelle: Vorfälle und Belege dokumentieren.",
    },
    {
      id: "work-unsafe",
      kind: "risk",
      flag: "unsafe-meeting",
      title: "Treffen ohne Schutz",
      detail: "Ein privates Treffen kann das Machtgefälle verschärfen. Bitte um einen sicheren, begleiteten Rahmen.",
      basis: "Polizeiliche Präventionshinweise und betriebliche Schutzpflichten.",
    },
  ],
  realFlow: [
    "Bei akuter Gefahr Abstand schaffen und 110 wählen; bei Verletzung 112 oder medizinische Hilfe nutzen.",
    "Nachrichten, E-Mails, Bilder, Kalenderdaten und Zeug*innen mit Datum und Kontext sichern.",
    "Interne Beschwerdestelle, Betriebsrat oder Vertrauensperson ansprechen; einen sicheren Gesprächsrahmen verlangen.",
    "Antidiskriminierungsstelle, Fachberatung oder anwaltliche Beratung zu AGG und möglichen Strafanzeigen nutzen.",
    "Konkrete Schutzmaßnahmen am Arbeitsplatz dokumentieren und bei neuen Vorfällen ergänzen.",
  ],
  glossary: [
    {
      term: "§ 3 AGG",
      note: "Definiert Belästigung und sexuelle Belästigung als Benachteiligung, wenn ein unerwünschtes Verhalten die Würde verletzt und ein einschüchterndes oder entwürdigendes Umfeld schafft.",
    },
    {
      term: "§ 13 AGG",
      note: "Beschäftigte haben ein Beschwerderecht bei der zuständigen Stelle des Betriebs oder der Dienststelle.",
    },
    {
      term: "Beschwerdestelle",
      note: "Eine betriebliche oder dienstliche Stelle, die Beschwerden nach dem AGG entgegennimmt und prüfen muss.",
    },
    {
      term: "Machtgefälle",
      note: "Ein Unterschied bei Einfluss, Abhängigkeit oder Zugang zu Arbeitsbedingungen; er kann die sichere Reaktion erschweren.",
    },
  ],
  sources: [
    {
      label: "Antidiskriminierungsstelle des Bundes · Sexuelle Belästigung",
      detail: "Informationen zu Rechten, Beschwerdewegen und Beratung im Arbeitsleben.",
      url: "https://www.antidiskriminierungsstelle.de/",
    },
    {
      label: "Allgemeines Gleichbehandlungsgesetz (AGG)",
      detail: "§§ 3, 12, 13 und 14 zu sexueller Belästigung, Schutzpflichten, Beschwerde und Unterstützung.",
      url: "https://www.gesetze-im-internet.de/agg/",
    },
    {
      label: "Hilfe-Info · Sexualisierte Gewalt",
      detail: "Bundesweite Informationen zu Hilfe, Anzeige, Beweissicherung und Opferrechten.",
      url: "https://www.hilfe-info.de/",
    },
  ],
};
