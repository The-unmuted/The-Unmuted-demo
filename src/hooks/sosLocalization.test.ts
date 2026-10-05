import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_TEMPLATE,
  DEFAULT_TEMPLATE_DE,
  loadSosTemplate,
  useSosMessage,
} from "@/hooks/useSosMessage";
import { buildLocationBlock, buildSmsBody } from "@/hooks/useEmergencyContacts";

const SOS_MESSAGE_KEY = "unmuted_sos_message";

describe("German SOS localization", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, String(value)),
        removeItem: (key: string) => values.delete(key),
        clear: () => values.clear(),
        key: (index: number) => Array.from(values.keys())[index] ?? null,
        get length() {
          return values.size;
        },
      },
    });
  });

  it("uses the German template when no message has been saved", () => {
    expect(loadSosTemplate("de")).toBe(DEFAULT_TEMPLATE_DE);
  });

  it("localizes an unchanged legacy default without replacing a custom message", () => {
    localStorage.setItem(SOS_MESSAGE_KEY, DEFAULT_TEMPLATE);
    expect(loadSosTemplate("de")).toBe(DEFAULT_TEMPLATE_DE);

    localStorage.setItem(SOS_MESSAGE_KEY, "Meine persönliche Notfallnachricht");
    expect(loadSosTemplate("de")).toBe("Meine persönliche Notfallnachricht");
  });

  it("resets an edited German message to the German default", () => {
    const { result } = renderHook(() => useSosMessage("de"));

    act(() => result.current.setTemplate("Meine persönliche Notfallnachricht"));
    expect(result.current.isDefault).toBe(false);

    act(() => result.current.reset());
    expect(result.current.template).toBe(DEFAULT_TEMPLATE_DE);
    expect(result.current.isDefault).toBe(true);
  });

  it("uses German labels and OpenStreetMap for German coordinates", () => {
    const location = buildLocationBlock(
      52.52,
      13.405,
      { accuracy: 8, battery: 72, network: "4g" },
      "de"
    );

    expect(location).toContain("GPS: 52.520000, 13.405000 (±8m)");
    expect(location).toContain("Karte: https://www.openstreetmap.org/");
    expect(location).toContain("Akku 72 % · 4G");
    expect(location).not.toContain("amap.com");
  });

  it("replaces the German location placeholder in the SMS body", () => {
    const body = buildSmsBody(
      52.52,
      13.405,
      "Standort:\n{Standort}",
      undefined,
      "de"
    );

    expect(body).toContain("Standort:\nGPS: 52.520000, 13.405000");
    expect(body).not.toContain("{Standort}");
  });

  it("keeps the existing China-oriented location format outside German mode", () => {
    const location = buildLocationBlock(31.2304, 121.4737, undefined, "zh");
    expect(location).toContain("导航: https://uri.amap.com/marker");
  });
});
