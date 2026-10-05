/**
 * German fallback copy for shared EN/ZH components.
 *
 * New German-first pages keep their copy next to the component. This table
 * covers older shared components so German mode never silently falls back to
 * English while those screens are being reused.
 */
export const GERMAN_COPY: Record<string, string> = {
  // Global shell and beta entry
  "The Unmuted": "The Unmuted",
  "THE UNMUTED": "THE UNMUTED",
  "SECURE RECORD PROTECT SPEAK": "SICHERN SCHÜTZEN SPRECHEN",
  "You were idle for a while; the demo re-locked itself. Click Enter Demo again to continue.":
    "Du warst eine Weile inaktiv; die Demo wurde automatisch gesperrt. Öffne die Beta erneut, um fortzufahren.",
  "The Unmuted · Beta": "The Unmuted · Beta",
  "Internal beta version. For feature preview only — please do not upload real evidence.":
    "Interne Betaversion. Nur zur Funktionsvorschau – bitte keine echten Beweismittel hochladen.",
  "Enter Beta": "Beta öffnen",
  "In the production version (skipped in this beta):":
    "In einer späteren Produktversion (in dieser Beta übersprungen):",
  "· Email registration + account password over HTTPS (Supabase Auth, bcrypt on the server)":
    "· E-Mail-Registrierung und Kontopasswort über HTTPS (Supabase Auth, bcrypt auf dem Server)",
  "· A separate vault password derives an Argon2id key on-device; the server only ever sees ciphertext":
    "· Ein separates Tresorpasswort leitet den Argon2id-Schlüssel auf dem Gerät ab; der Server sieht nur verschlüsselte Daten",
  "· A 12-character paper recovery key as the only backup if the vault password is lost":
    "· Ein zwölfstelliges Wiederherstellungskennwort auf Papier als einzige Sicherung bei Verlust des Tresorpassworts",
  "· Records are stored on Tencent CloudBase in mainland China (post-ICP)":
    "· Produktiv-Hosting und Datenschutzkonzept für Deutschland sind noch nicht freigegeben",
  "In this beta, when the app asks for a \"vault password\", just enter ":
    "Wenn diese Beta nach einem „Tresorpasswort“ fragt, gib einfach ",
  " (flow simulation only — real cryptography runs behind the scenes with a hardcoded beta key).":
    " ein (nur Ablaufsimulation – im Hintergrund läuft echte Verschlüsselung mit einem fest hinterlegten Beta-Schlüssel).",

  // Header tools, safety information and feedback
  "Join the tester WeChat group": "Der WeChat-Testgruppe beitreten",
  "Join our WeChat tester group": "Unserer WeChat-Testgruppe beitreten",
  "Scan with WeChat to join. Group QR refreshes weekly — if it fails, tap the 👗 again for the latest one.":
    "Scanne den Code mit WeChat. Der Gruppen-QR-Code wird wöchentlich erneuert. Falls er nicht funktioniert, tippe erneut auf 👗.",
  "WeChat group QR code": "QR-Code der WeChat-Testgruppe",
  "Your feedback shapes what we build next. Thank you.":
    "Dein Feedback beeinflusst, was wir als Nächstes entwickeln. Danke.",
  "Open weather (Back returns here)": "Wetter öffnen (Zurück führt hierher)",
  "Weather · Back returns here": "Wetter · Zurück führt hierher",
  "Quick exit": "Schnell verlassen",
  "Exit": "Verlassen",
  "Tap \"Exit\" at the top right and this page instantly becomes a weather search — the Back button will not come back here.":
    "Tippe oben rechts auf „Verlassen“. Diese Seite wird sofort durch eine Wettersuche ersetzt; die Zurück-Taste führt nicht hierher zurück.",
  "Returnable weather button": "Wetter-Schaltfläche mit Rückkehrmöglichkeit",
  "The small cloud button opens weather while keeping this page in browser history. Use the browser Back button or gesture to return. If your phone may be checked, use the Exit button instead.":
    "Die kleine Wolken-Schaltfläche öffnet das Wetter und behält diese Seite im Browserverlauf. Kehre mit der Zurück-Taste oder -Geste zurück. Wenn jemand dein Telefon kontrollieren könnte, nutze stattdessen „Verlassen“.",
  "Use private browsing": "Privaten Browsermodus verwenden",
  "A private/incognito window leaves no history after you close it. iPhone Safari: tabs button → Private. Android Chrome: ⋮ → New Incognito tab.":
    "Ein privates Inkognito-Fenster hinterlässt nach dem Schließen keinen Verlauf. iPhone Safari: Tab-Taste → Privat. Android Chrome: ⋮ → Neuer Inkognito-Tab.",
  "Clear history afterwards": "Verlauf anschließend löschen",
  "If you didn't use private browsing: iPhone — Settings → Safari → Clear History and Website Data. Android Chrome — ⋮ → History → Clear browsing data.":
    "Wenn du keinen privaten Modus genutzt hast: iPhone – Einstellungen → Safari → Verlauf und Websitedaten löschen. Android Chrome – ⋮ → Verlauf → Browserdaten löschen.",
  "If your phone may be checked": "Wenn jemand dein Telefon kontrollieren könnte",
  "Prefer a safer device: a trusted friend's phone, or a public computer in a private window.":
    "Nutze möglichst ein sichereres Gerät: das Telefon einer vertrauten Person oder einen öffentlichen Computer im privaten Browserfenster.",
  "How to use this site safely": "Diese Website sicher verwenden",
  "Safe-use tips": "Hinweise zur sicheren Nutzung",
  "Using this site safely": "Sichere Nutzung dieser Website",
  "Close": "Schließen",
  "Feedback": "Feedback",
  "Send feedback": "Feedback senden",
  "Thank you!": "Vielen Dank!",
  "Bug": "Fehler",
  "Suggestion": "Vorschlag",
  "Other": "Sonstiges",
  "Describe your feedback…": "Beschreibe dein Feedback …",
  "Failed to send. Please try again.": "Senden fehlgeschlagen. Bitte versuche es erneut.",
  "Submit": "Senden",
  "Welcome to The Unmuted": "Willkommen bei The Unmuted",
  "Welcome to The Unmuted — tell us what you think":
    "Willkommen bei The Unmuted – sag uns, was du denkst",

  // Post-SOS support sheet and legacy directory labels
  "Nearby Support": "Unterstützung in Deutschland",
  "You're safe now. These organizations can provide follow-up support.":
    "Du bist jetzt in Sicherheit. Diese Stellen können dich weiter unterstützen.",
  "Call": "Anrufen",
  "Website": "Website",
  "NGO Directory": "Hilfsstellenverzeichnis",
  "All": "Alle",
  "Legal": "Recht",
  "Mental Health": "Psychische Hilfe",
  "Shelter": "Schutzunterkunft",
  "Hotline": "Hotline",
  "Find legal, psychological and shelter support.":
    "Finde rechtliche, psychologische und schützende Unterstützung.",
  "Browse": "Suchen",
  "Apply": "Eintrag beantragen",
  "Filter by city or area…": "Nach Stadt oder Region filtern …",
  "No organizations found.": "Keine Organisationen gefunden.",
  "Application submitted!": "Antrag gesendet!",
  "We will review your application and reach out within 3–5 business days.":
    "Wir prüfen den Antrag und melden uns innerhalb von drei bis fünf Werktagen.",
  "Submit another": "Weiteren Antrag senden",
  "Are you a registered NGO or support organization? Apply to be listed in the directory.":
    "Ist deine Organisation eine registrierte Hilfs- oder Beratungsstelle? Beantrage einen Eintrag im Verzeichnis.",
  "Organization name *": "Name der Organisation *",
  "Contact person *": "Kontaktperson *",
  "Coverage area (city / province) *": "Zuständigkeitsgebiet (Stadt / Bundesland) *",
  "Phone number": "Telefonnummer",
  "Website (optional)": "Website (optional)",
  "Registration number, credentials, or brief description of services…":
    "Registrierungsnummer, Qualifikation oder kurze Beschreibung des Angebots …",
  "Submission failed. Please try again.": "Übermittlung fehlgeschlagen. Bitte versuche es erneut.",
  "Submit application": "Antrag senden",

  // Evidence types and general actions
  "Image": "Bild",
  "Video": "Video",
  "Audio": "Audio",
  "File": "Datei",
  "Copied": "Kopiert",
  "The Unmuted · Local Encrypted Notes Receipt": "The Unmuted · Lokaler verschlüsselter Notizbeleg",
  "This is a demo local receipt. The note text is encrypted and is not shown here in plain text.":
    "Dies ist ein lokaler Demo-Beleg. Der Notiztext ist verschlüsselt und wird hier nicht im Klartext angezeigt.",
  "Saved at": "Gespeichert am",
  "Scene": "Situation",
  "Saved fields": "Gespeicherte Felder",
  "Saved count": "Anzahl gespeicherter Einträge",
  "Encryption": "Verschlüsselung",
  "Record ID": "Datensatz-ID",
  "Encrypted hash SHA-256": "SHA-256-Prüfsumme der verschlüsselten Daten",
  "IV": "Initialisierungsvektor",
  "Encrypted payload:": "Verschlüsselte Nutzdaten:",
  "Keep this file together with your app records. It is only a demo receipt and is not legal advice.":
    "Bewahre diese Datei zusammen mit deinen App-Datensätzen auf. Sie ist nur ein Demo-Beleg und keine Rechtsberatung.",
  "Captured live": "Direkt aufgenommen",
  "Added later": "Später hinzugefügt",
  "Evidence Secured": "Beweismittel gesichert",
  "Locked and saved to your encrypted vault. Nobody else can open it — not even us.":
    "Verschlüsselt und im sicheren Beweisspeicher abgelegt. Niemand außer dir kann die Datei öffnen – auch wir nicht.",
  "No internet right now — saved on this phone, locked. It can sync when the vault connection is available.":
    "Derzeit keine Internetverbindung – verschlüsselt auf diesem Gerät gespeichert. Die Synchronisierung kann später fortgesetzt werden.",
  "Encrypted report notes": "Verschlüsselte Notizen zum Vorfall",
  "Demo preview: these notes can be saved with this encrypted evidence report.":
    "Demo-Vorschau: Diese Notizen können mit dem verschlüsselten Beweisbericht gespeichert werden.",
  "View evidence details": "Details zum Beweismittel anzeigen",
  "Encrypted file fingerprint (SHA-256)": "Prüfsumme der verschlüsselten Datei (SHA-256)",
  "Original file fingerprint (SHA-256)": "Prüfsumme der Originaldatei (SHA-256)",
  "Captured at": "Aufgenommen am",
  "Captured at location (only you can see this)": "Aufnahmeort (nur für dich sichtbar)",
  "Finish report": "Bericht abschließen",
  "Continue": "Weiter",
  "Could not access microphone. Please check permissions.":
    "Auf das Mikrofon konnte nicht zugegriffen werden. Bitte prüfe die Berechtigungen.",
  "Ready to upload": "Bereit zum Verschlüsseln",
  " item(s)": " Datei(en)",
  "Capture time and location are saved with the file and locked together. Only you can see them.":
    "Aufnahmezeit und Standort werden zusammen mit der Datei verschlüsselt. Nur du kannst sie sehen.",
  "Processing...": "Wird verarbeitet …",
  "Locking the file (AES-256 encryption)": "Datei wird verschlüsselt (AES-256)",
  "Done on your phone. Nothing leaves unencrypted.":
    "Die Verschlüsselung erfolgt auf deinem Gerät. Nichts verlässt es unverschlüsselt.",
  "Saving to your encrypted vault": "Im sicheren Beweisspeicher speichern",
  "Only the locked file is stored. No one can open it but you.":
    "Nur die verschlüsselte Datei wird gespeichert. Niemand außer dir kann sie öffnen.",
  "Evidence failed": "Sicherung fehlgeschlagen",
  "Retry": "Erneut versuchen",
  "Recover a mistakenly deleted record": "Versehentlich gelöschten Datensatz wiederherstellen",
  "Write one note first.": "Schreibe zuerst mindestens eine Notiz.",
  "Encrypted notes saved on this device.": "Verschlüsselte Notizen wurden auf diesem Gerät gespeichert.",
  "Could not save encrypted notes.": "Die verschlüsselten Notizen konnten nicht gespeichert werden.",
  "What happened?": "Was ist passiert?",
  "Choose one. We only show the most important next steps.":
    "Wähle eine Situation. Wir zeigen nur die wichtigsten nächsten Schritte.",
  "Safety first. Do not move, do not wash if safe. Photograph first, then seek help.":
    "Deine Sicherheit geht vor. Wenn es sicher ist: nichts verändern oder waschen, zuerst fotografieren und dann Hilfe suchen.",
  "Report guideline": "Hinweise zur Dokumentation",
  "Fill only what you know. Empty fields are okay.":
    "Trage nur ein, was du weißt. Felder dürfen leer bleiben.",
  "Save encrypted notes": "Notizen verschlüsselt speichern",
  "Notes are encrypted before local saving and can attach to the evidence receipt.":
    "Die Notizen werden vor dem lokalen Speichern verschlüsselt und können dem Beleg beigefügt werden.",
  "Text receipt ready": "Textbeleg ist bereit",
  "If your browser did not start the download automatically, tap the button below.":
    "Falls der Download nicht automatisch beginnt, tippe auf die Schaltfläche unten.",
  "Download text receipt": "Textbeleg herunterladen",
  "Encrypted on your device": "Auf deinem Gerät verschlüsselt",
  "Files are encrypted on your device before anything is uploaded. Only you hold the key.":
    "Dateien werden vor jeder Übertragung auf deinem Gerät verschlüsselt. Nur du besitzt den Schlüssel.",
  "Encrypted vault": "Sicherer Beweisspeicher",
  "Encrypted files go into your private vault. Demo data stays in this browser.":
    "Verschlüsselte Dateien kommen in deinen privaten Beweisspeicher. Demo-Daten bleiben in diesem Browser.",
  "Fingerprint & time, fixed at capture": "Prüfsumme und Zeit bei der Aufnahme festgehalten",
  "The file's fingerprint and time are fixed the moment you capture — any later change is detectable. Trusted timestamping is being integrated.":
    "Prüfsumme und Zeitpunkt werden bei der Aufnahme festgehalten; spätere Änderungen sind erkennbar. Eine vertrauenswürdige Zeitstempelung wird noch integriert.",
  "How it works": "So funktioniert es",
  "What counts as evidence?": "Was kann als Beweismittel dienen?",

  // Evidence vault, export, deletion and recovery
  "At least 6 characters.": "Mindestens 6 Zeichen.",
  "The two entries don't match.": "Die beiden Eingaben stimmen nicht überein.",
  "Record deleted.": "Datensatz gelöscht.",
  "Could not delete right now.": "Der Datensatz kann derzeit nicht gelöscht werden.",
  "Could not open this file right now.": "Die Datei kann derzeit nicht geöffnet werden.",
  "Court package saved. The evidence inside is encrypted with the password you just set — share that password with the recipient through a secure channel.":
    "Das Gerichtspaket wurde gespeichert. Das Beweismittel ist mit dem eben festgelegten Passwort verschlüsselt. Teile es nur über einen sicheren Kanal.",
  "File unlocked and saved to this device. Delete it after use if this phone isn't safe.":
    "Die Datei wurde entschlüsselt und auf diesem Gerät gespeichert. Lösche sie nach Gebrauch, wenn das Gerät nicht sicher ist.",
  "Could not unlock this note on this device.": "Die Notiz konnte auf diesem Gerät nicht entschlüsselt werden.",
  "The Unmuted · Text Evidence Note": "The Unmuted · Textnotiz zum Beweismittel",
  "Unlocked text:": "Entschlüsselter Text:",
  "This file was decrypted locally in this browser for export.":
    "Diese Datei wurde für den Export lokal in diesem Browser entschlüsselt.",
  "Court package saved. Share the export password through a secure channel.":
    "Das Gerichtspaket wurde gespeichert. Teile das Exportpasswort über einen sicheren Kanal.",
  "Could not export this note right now.": "Die Notiz kann derzeit nicht exportiert werden.",
  "Encrypted Vault": "Sicherer Beweisspeicher",
  "Encrypted record": "Verschlüsselter Datensatz",
  "Encrypted ✓": "Verschlüsselt ✓",
  "Waiting to upload": "Wartet auf Übertragung",
  "Court package": "Gerichtspaket",
  "Unlock & save": "Entschlüsseln und speichern",
  "Delete": "Löschen",
  "Delete this record?": "Diesen Datensatz löschen?",
  "Confirm delete": "Löschen bestätigen",
  "Cancel": "Abbrechen",
  "Set a password for this court package. The recipient needs it to open the evidence file. Don't reuse your vault password.":
    "Lege ein Passwort für dieses Gerichtspaket fest. Die empfangende Person benötigt es zum Öffnen der Datei. Verwende nicht dein Tresorpasswort.",
  "Demo mode — the field is pre-filled with ": "Demo-Modus – das Feld ist vorausgefüllt mit ",
  ". Just click Encrypt & export. The recipient uses the same password with the decryptor tool inside the ZIP.":
    ". Tippe auf „Verschlüsseln und exportieren“. Die empfangende Person nutzt dasselbe Passwort mit dem Entschlüsselungswerkzeug in der ZIP-Datei.",
  "New password (min 8 chars)": "Neues Passwort (mindestens 8 Zeichen)",
  "New password (min 6 chars)": "Neues Passwort (mindestens 6 Zeichen)",
  "Confirm password": "Passwort bestätigen",
  "Encrypt & export": "Verschlüsseln und exportieren",
  "Enter your password to unlock and save this file.":
    "Gib dein Passwort ein, um die Datei zu entschlüsseln und zu speichern.",
  "Enter your password to unlock the vault before exporting.":
    "Gib dein Passwort ein, um den Beweisspeicher vor dem Export zu entsperren.",
  "Enter your password to delete this record.": "Gib dein Passwort ein, um diesen Datensatz zu löschen.",
  "Demo mode — please enter ": "Demo-Modus – bitte eingeben: ",
  ". (In the production version this asks for your real vault password, which stays on your device.)":
    ". (In der Produktversion wird hier dein echtes Tresorpasswort abgefragt; es bleibt auf deinem Gerät.)",
  "Couldn't open your vault right now. Check your connection and try again.":
    "Der Beweisspeicher kann derzeit nicht geöffnet werden. Prüfe die Verbindung und versuche es erneut.",
  "Incorrect password. Please try again.": "Falsches Passwort. Bitte versuche es erneut.",
  "Next": "Weiter",
  "Unlock": "Entsperren",
  "Text note": "Textnotiz",
  "item(s)": "Eintrag/Einträge",
  "Hide": "Ausblenden",
  "Unlock & view": "Entsperren und ansehen",
  "Set a password for this court package. The recipient needs it to open the text note.":
    "Lege ein Passwort für dieses Gerichtspaket fest. Die empfangende Person benötigt es zum Öffnen der Textnotiz.",
  "Demo mode — pre-filled with ": "Demo-Modus – vorausgefüllt mit ",
  "Enter your password to unlock this text note.": "Gib dein Passwort ein, um diese Textnotiz zu entsperren.",
  "Unlocked in this browser only. Nothing is uploaded.":
    "Nur in diesem Browser entschlüsselt. Es wird nichts hochgeladen.",
  "View matching guide": "Passende Hinweise anzeigen",
  "Restored to your records.": "In deinen Datensätzen wiederhergestellt.",
  "Could not restore right now.": "Der Datensatz kann derzeit nicht wiederhergestellt werden.",
  "Recently deleted": "Kürzlich gelöscht",
  "Enter your password again to see records deleted in the last 3 days.":
    "Gib dein Passwort erneut ein, um Datensätze zu sehen, die in den letzten drei Tagen gelöscht wurden.",
  "Password": "Passwort",
  "Verify": "Bestätigen",
  "Nothing to recover.": "Keine wiederherstellbaren Datensätze.",
  "Records deleted more than 3 days ago are erased for good.":
    "Datensätze, die vor mehr als drei Tagen gelöscht wurden, sind endgültig entfernt.",
  "Restore": "Wiederherstellen",
  "Older records (need your saved key file)": "Ältere Datensätze (gespeicherte Schlüsseldatei erforderlich)",
  "Demo": "Demo",
  "Test chain (legacy)": "Testkette (veraltet)",

  // Evidence situation guides
  "Memory gap / possible drugging": "Erinnerungslücke / möglicher Einsatz von K.-o.-Mitteln",
  "Use this if you woke up confused, passed out, or cannot remember part of what happened.":
    "Nutze dies, wenn du verwirrt aufgewacht oder ohnmächtig geworden bist oder dich an Teile des Geschehens nicht erinnern kannst.",
  "If safe, do not shower, brush teeth, or change clothes yet.":
    "Wenn es sicher ist, dusche noch nicht, putze nicht die Zähne und wechsle noch nicht die Kleidung.",
  "Save cups, bottles, tissues, towels, bedding, and clothes separately.":
    "Bewahre Becher, Flaschen, Taschentücher, Handtücher, Bettwäsche und Kleidung getrennt auf.",
  "Write down the last clear memory, place, people nearby, and what you drank or ate.":
    "Notiere die letzte klare Erinnerung, den Ort, anwesende Personen und was du getrunken oder gegessen hast.",
  "Ask medical or police professionals about urine, blood, injury, and forensic checks.":
    "Frage medizinisches Fachpersonal oder die Polizei nach Urin- und Blutproben, Verletzungsdokumentation und vertraulicher Spurensicherung.",
  "Sexual assault / forced contact": "Sexualisierte Gewalt / erzwungener Kontakt",
  "Use this if someone forced, touched, filmed, threatened, or controlled you.":
    "Nutze dies, wenn dich jemand gezwungen, berührt, gefilmt, bedroht oder kontrolliert hat.",
  "Your safety comes first. Leave the person or place before collecting evidence.":
    "Deine Sicherheit geht vor. Entferne dich von der Person oder dem Ort, bevor du Beweismittel sammelst.",
  "Try not to wash your body, wounds, nails, mouth, or private areas before help arrives.":
    "Wenn es sicher und möglich ist, wasche Körper, Wunden, Nägel, Mund und Intimbereich vor der medizinischen Hilfe möglichst nicht.",
  "Photograph injuries with time and context if you can.":
    "Fotografiere Verletzungen möglichst mit Zeitangabe und erkennbarem Zusammenhang.",
  "Save chat logs, calls, location timeline, and health data from your phone or watch.":
    "Sichere Chatverläufe, Anrufe, Standortverlauf sowie Gesundheitsdaten von Telefon oder Uhr.",
  "Stalking / threat": "Stalking / Bedrohung",
  "Use this if someone is following, watching, exposing, or threatening you.":
    "Nutze dies, wenn dich jemand verfolgt, beobachtet, bloßstellt oder bedroht.",
  "Do not confront them alone. Move toward a public or trusted place.":
    "Konfrontiere die Person nicht allein. Begib dich an einen öffentlichen oder vertrauten Ort.",
  "Save messages, calls, photos, usernames, plates, and repeated time patterns.":
    "Sichere Nachrichten, Anrufe, Fotos, Benutzernamen, Kennzeichen und wiederkehrende zeitliche Muster.",
  "Share your route with a trusted person and ask them to stay online.":
    "Teile deine Route mit einer Vertrauensperson und bitte sie, erreichbar zu bleiben.",
  "Use Community Help if you need accompaniment or a safe space.":
    "Nutze die Beratungsangebote, wenn du Begleitung oder einen sicheren Ort brauchst.",
  "Unsafe date / unfamiliar place": "Unsicheres Treffen / unbekannter Ort",
  "Use this before or after a meeting, apartment viewing, party, or private room situation.":
    "Nutze dies vor oder nach einem Treffen, einer Wohnungsbesichtigung, einer Party oder einer Situation in privaten Räumen.",
  "Meet in public first and keep your phone charged and close.":
    "Triff dich zuerst an einem öffentlichen Ort und halte dein geladenes Telefon griffbereit.",
  "Get your own drink or food. Leave if dizziness, nausea, or extreme sleepiness feels wrong.":
    "Hole Getränke und Essen möglichst selbst. Verlasse den Ort bei ungewöhnlichem Schwindel, Übelkeit oder starker Müdigkeit.",
  "Send the place, contact, and time plan to someone you trust.":
    "Sende Ort, Kontaktdaten und Zeitplan an eine Vertrauensperson.",
  "If something happened, memory gaps are normal. Write only what you remember.":
    "Nach einem belastenden Ereignis können Erinnerungslücken auftreten. Notiere nur, woran du dich erinnerst.",

  // Evidence note labels and placeholders
  "Last clear memory": "Letzte klare Erinnerung",
  "Time, place, who was there...": "Zeit, Ort und anwesende Personen …",
  "Where I woke up / noticed danger": "Wo ich aufgewacht bin / Gefahr bemerkt habe",
  "Room, street, car, hotel...": "Zimmer, Straße, Auto, Hotel …",
  "People nearby": "Anwesende Personen",
  "Names, nicknames, accounts, descriptions...": "Namen, Spitznamen, Konten, Beschreibungen …",
  "Drinks / food / medicine": "Getränke / Essen / Medikamente",
  "What you drank, ate, or were offered...": "Was du getrunken, gegessen oder angeboten bekommen hast …",
  "Body signs / unusual feelings": "Körperliche Anzeichen / ungewöhnliche Empfindungen",
  "Pain, bruises, nausea, extreme sleepiness...": "Schmerzen, Blutergüsse, Übelkeit, starke Müdigkeit …",
  "Where I am now / safety status": "Aktueller Ort / Sicherheitslage",
  "Safe place, trusted person, urgent risk nearby...": "Sicherer Ort, Vertrauensperson, unmittelbare Gefahr in der Nähe …",
  "What I remember happened": "Woran ich mich erinnere",
  "Only write what you remember. Missing details are okay...": "Notiere nur, woran du dich erinnerst. Fehlende Einzelheiten sind in Ordnung …",
  "Injuries / body signs": "Verletzungen / körperliche Anzeichen",
  "Pain, bruises, bleeding, torn clothes, unusual feelings...": "Schmerzen, Blutergüsse, Blutungen, beschädigte Kleidung, ungewöhnliche Empfindungen …",
  "Things to preserve": "Zu sichernde Gegenstände",
  "Clothes, bedding, tissues, towels, protection, cups...": "Kleidung, Bettwäsche, Taschentücher, Handtücher, Schutzmittel, Becher …",
  "Messages / calls / location timeline": "Nachrichten / Anrufe / Standortverlauf",
  "Chats, calls, ride records, photos, health/watch data...": "Chats, Anrufe, Fahrtdaten, Fotos, Gesundheits- oder Uhrendaten …",
  "Repeated pattern": "Wiederkehrendes Muster",
  "When, where, how often, same person or account...": "Wann, wo, wie oft, dieselbe Person oder dasselbe Konto …",
  "Person / account / vehicle details": "Angaben zu Person / Konto / Fahrzeug",
  "Names, usernames, phone numbers, plates, descriptions...": "Namen, Benutzernamen, Telefonnummern, Kennzeichen, Beschreibungen …",
  "Evidence already saved": "Bereits gesicherte Beweismittel",
  "Screenshots, photos, audio, camera footage, call logs...": "Screenshots, Fotos, Audio, Videoaufnahmen, Anruflisten …",
  "Route / safe contact": "Route / sichere Kontaktperson",
  "Where you are going, who knows, who can stay online...": "Wohin du gehst, wer davon weiß und wer erreichbar bleiben kann …",
  "Meeting plan / place": "Plan / Ort des Treffens",
  "Address, time, room number, who invited you...": "Adresse, Zeit, Zimmernummer, einladende Person …",
  "Person / contact details": "Person / Kontaktdaten",
  "Name, account, phone, photos, mutual friends...": "Name, Konto, Telefonnummer, Fotos, gemeinsame Bekannte …",
  "Drinks / food offered": "Angebotene Getränke / Speisen",
  "What you drank or ate, who gave it to you, when...": "Was du wann getrunken oder gegessen hast und wer es dir gegeben hat …",
  "Warning signs": "Warnzeichen",
  "Dizziness, nausea, sleepiness, pressure, locked door...": "Schwindel, Übelkeit, Müdigkeit, Druck, verschlossene Tür …",
  "Who knows where I am": "Wer meinen Aufenthaltsort kennt",
  "Trusted friend, roommate, shared location, message sent...": "Vertrauensperson, Mitbewohner:in, geteilter Standort, gesendete Nachricht …",

  // Deterrent audio and vault service errors
  "File is too large. Please choose audio under 5MB.": "Die Datei ist zu groß. Bitte wähle eine Audiodatei unter 5 MB.",
  "Deterrent audio": "Abschreckungs-Audio",
  "Stop": "Stopp",
  "Preview": "Anhören",
  "Audio uploaded": "Audio hochgeladen",
  "Upload custom deterrent audio (MP3/WAV, <=5MB). It loops when SOS is triggered.":
    "Lade ein eigenes Abschreckungs-Audio hoch (MP3/WAV, höchstens 5 MB). Es wird bei ausgelöstem SOS wiederholt.",
  "Upload audio file": "Audiodatei hochladen",
  "System speech is used if no audio is uploaded.": "Ohne hochgeladene Datei wird die Systemstimme verwendet.",
  "Please sign in first.": "Bitte melde dich zuerst an.",
  "Please unlock your vault first — go to Evidence Records and tap \"Unlock & save\" on any record.":
    "Entsperre zuerst deinen Beweisspeicher. Öffne „Gespeicherte Beweise“ und tippe bei einem Datensatz auf „Entschlüsseln und speichern“.",
  "Encryption failed: ": "Verschlüsselung fehlgeschlagen: ",
  "Could not save: ": "Speichern fehlgeschlagen: ",

  // Not found
  "Oops! Page not found": "Seite nicht gefunden",
  "Return to Home": "Zur Startseite",
};

export function germanCopyFor(english: string): string {
  const direct = GERMAN_COPY[english];
  if (direct) return direct;

  let match = english.match(/^All (\d+) file\(s\) saved\.$/);
  if (match) return `Alle ${match[1]} Datei(en) wurden gespeichert.`;

  match = english.match(/^(\d+) saved, (\d+) failed\.$/);
  if (match) return `${match[1]} gespeichert, ${match[2]} fehlgeschlagen.`;

  match = english.match(/^Encrypt & upload all \((\d+)\)$/);
  if (match) return `Alle verschlüsseln und speichern (${match[1]})`;

  match = english.match(/^File (\d+) of (\d+)$/);
  if (match) return `Datei ${match[1]} von ${match[2]}`;

  match = english.match(/^Saved (\d+) encrypted notes\. View them in Evidence Records\.$/);
  if (match) return `${match[1]} verschlüsselte Notiz(en) gespeichert. Du findest sie unter „Gespeicherte Beweise“.`;

  match = english.match(/^Erased for good in about (\d+) day(?:s)?$/);
  if (match) return `In etwa ${match[1]} Tag(en) endgültig gelöscht`;

  match = english.match(/^Erased for good in about (\d+) hour(?:s)?$/);
  if (match) return `In etwa ${match[1]} Stunde(n) endgültig gelöscht`;

  return english;
}

export function hasGermanCopy(english: string): boolean {
  return germanCopyFor(english) !== english || Object.prototype.hasOwnProperty.call(GERMAN_COPY, english);
}
