import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import GermanyAidPage from "@/components/GermanyAidPage";
import GermanySimulationPage from "@/components/GermanySimulationPage";
import DemoWelcome from "@/components/DemoWelcome";
import FeedbackWidget from "@/components/FeedbackWidget";
import { NGOSuggestionSheet } from "@/components/NGOPage";
import WeChatGroupButton from "@/components/WeChatGroupButton";
import WelcomeFeedbackDialog from "@/components/WelcomeFeedbackDialog";
import { copyFor } from "@/lib/locale";
import { GERMANY_SEXUAL_ASSAULT_SCENARIO } from "@/data/germanySimulation";
import { GERMANY_SEXUAL_HARASSMENT_SCENARIO } from "@/data/germanySimulation";

describe("Germany aid directory", () => {
  it("separates nationwide social, legal, and mental-health resources", () => {
    render(<GermanyAidPage />);

    expect(screen.getByText("Hilfe in Deutschland")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Polizei 110" })).toBeTruthy();
    expect(screen.getByText("Hilfetelefon Gewalt gegen Frauen")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Recht" }));
    expect(screen.getByText("Beratungshilfe")).toBeTruthy();
    expect(screen.getByText("Hilfe-Info · Opferhilfe-Portal")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Psychische Hilfe" }));
    expect(screen.getByRole("heading", { name: "TelefonSeelsorge Deutschland" })).toBeTruthy();
    expect(screen.getByText("Patientenservice 116117")).toBeTruthy();
  });
});

describe("Germany practice simulator", () => {
  it("includes a non-graphic sexualised-violence scenario with German legal sources", () => {
    expect(GERMANY_SEXUAL_ASSAULT_SCENARIO.title).toContain("Sexualisierte Gewalt");
    expect(GERMANY_SEXUAL_ASSAULT_SCENARIO.tagline).toContain("Vergewaltigung");
    expect(GERMANY_SEXUAL_ASSAULT_SCENARIO.scenes.opening.choices.length).toBeGreaterThanOrEqual(4);
    expect(GERMANY_SEXUAL_ASSAULT_SCENARIO.glossary.some((item) => item.term === "§ 177 StGB")).toBe(true);
    expect(GERMANY_SEXUAL_ASSAULT_SCENARIO.sources.some((source) => source.url.endsWith("/stgb/__177.html"))).toBe(true);
  });

  it("includes a workplace sexual-harassment scenario with AGG sources", () => {
    expect(GERMANY_SEXUAL_HARASSMENT_SCENARIO.title).toContain("Sexuelle Belästigung");
    expect(GERMANY_SEXUAL_HARASSMENT_SCENARIO.glossary.some((item) => item.term === "§ 13 AGG")).toBe(true);
    expect(GERMANY_SEXUAL_HARASSMENT_SCENARIO.sources.some((source) => source.url.endsWith("/agg/"))).toBe(true);
  });

  it("warns before entry and completes the stalking protection path", () => {
    const onGoToAid = vi.fn();
    render(<GermanySimulationPage onGoToAid={onGoToAid} />);

    fireEvent.click(screen.getByRole("button", { name: /Häusliche Gewalt: sicher handeln/ }));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText(/traumatische Erinnerungen auslösen/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Übung beginnen" }));
    fireEvent.click(screen.getByRole("button", { name: /Nach der Trennung/ }));
    fireEvent.click(screen.getByRole("button", { name: /Nachrichten und Vorfälle vollständig sichern/ }));
    fireEvent.click(screen.getByRole("button", { name: /Polizei und Beratungsstelle einbeziehen/ }));

    expect(screen.getByTestId("germany-simulation-result")).toBeTruthy();
    expect(screen.getByText("Schutzwege miteinander verbunden")).toBeTruthy();
    expect(screen.getByText("Realer Ablauf in Deutschland")).toBeTruthy();
    expect(screen.getByText("Originalquellen")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Echte Hilfsangebote öffnen" }));
    expect(onGoToAid).toHaveBeenCalledTimes(1);
  });
});

describe("German shared-interface localization", () => {
  it("renders the complete beta-entry screen in German", () => {
    render(<DemoWelcome language="de" onEnter={vi.fn()} />);

    expect(screen.getByText(/Interne Betaversion/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Beta öffnen" })).toBeTruthy();
    expect(screen.getByText(/Produktiv-Hosting und Datenschutzkonzept/)).toBeTruthy();
    expect(screen.getAllByText(/Tresorpasswort/).length).toBeGreaterThan(0);
  });

  it("localizes the feedback dialog controls", () => {
    render(<FeedbackWidget language="de" />);
    fireEvent.click(screen.getByRole("button", { name: "Feedback" }));

    expect(screen.getByRole("dialog", { name: "Feedback senden" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Fehler" })).toBeTruthy();
    expect(screen.getByPlaceholderText("Beschreibe dein Feedback …")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Senden" })).toBeTruthy();
  });

  it("uses German nationwide services after the SOS safe action", () => {
    render(<NGOSuggestionSheet language="de" onClose={vi.fn()} />);

    expect(screen.getByText("Unterstützung in Deutschland")).toBeTruthy();
    expect(screen.getByText("Hilfetelefon Gewalt gegen Frauen")).toBeTruthy();
    expect(screen.getByText("Opfer-Telefon 116 006")).toBeTruthy();
    expect(screen.getByText("TelefonSeelsorge Deutschland")).toBeTruthy();
  });

  it("localizes the tester-group dialog, including its close control", () => {
    render(<WeChatGroupButton language="de" />);
    fireEvent.click(screen.getByRole("button", { name: "Der WeChat-Testgruppe beitreten" }));

    expect(screen.getByRole("dialog", { name: "Unserer WeChat-Testgruppe beitreten" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Schließen" })).toBeTruthy();
  });

  it("uses German HTML content instead of the Chinese welcome artwork", () => {
    render(<WelcomeFeedbackDialog open onOpenChange={vi.fn()} language="de" />);

    expect(screen.getAllByText("Willkommen bei The Unmuted").length).toBeGreaterThan(0);
    expect(screen.getByText("Feedback geben")).toBeTruthy();
    expect(screen.getByText("Mit der Testgruppe austauschen")).toBeTruthy();
    expect(screen.queryByAltText("欢迎使用非默 — 我们期待你的反馈")).toBeNull();
  });

  it("translates shared evidence-vault details and dynamic progress", () => {
    expect(copyFor("de", "Evidence Secured", "存证完成")).toBe("Beweismittel gesichert");
    expect(copyFor("de", "Memory gap / possible drugging", "记忆空白")).toBe(
      "Erinnerungslücke / möglicher Einsatz von K.-o.-Mitteln"
    );
    expect(copyFor("de", "File 2 of 4", "第 2 / 4 张")).toBe("Datei 2 von 4");
    expect(copyFor("de", "Saved 3 encrypted notes. View them in Evidence Records.", "已保存")).toBe(
      "3 verschlüsselte Notiz(en) gespeichert. Du findest sie unter „Gespeicherte Beweise“."
    );
    expect(["All", "Legal", "Mental Health", "Shelter", "Hotline"].map((label) =>
      copyFor("de", label, label)
    )).toEqual(["Alle", "Recht", "Psychische Hilfe", "Schutzunterkunft", "Hotline"]);
  });
});
