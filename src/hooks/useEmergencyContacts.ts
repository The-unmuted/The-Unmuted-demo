/**
 * Emergency contacts — localStorage-based management + SMS URI builder.
 *
 * Contacts are stored locally only. On SOS trigger the app opens the
 * native SMS app pre-filled with a bilingual help message that includes:
 *   - GPS coordinates + accuracy radius
 *   - A tappable Gaode navigation link
 *   - Battery level + network type (for rescue team to estimate connectivity)
 */

import { useState, useCallback } from "react";

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

/** Extra device context included in the SOS message */
export interface LocationExtras {
  accuracy?: number;   // GPS accuracy radius in metres
  battery?: number;    // 0–100 %
  network?: string;    // "4g" | "3g" | "wifi" | "2g" | etc.
}

const STORAGE_KEY = "unmuted_emergency_contacts";

/** Exported so SOSButton can read fresh contacts at trigger time, bypassing stale React state */
export function loadContacts(): EmergencyContact[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EmergencyContact[]) : [];
  } catch {
    return [];
  }
}

function saveContacts(contacts: EmergencyContact[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

/**
 * Build a rich location block that replaces `{位置}` in the SOS template.
 *
 * Format (Chinese + English):
 *   GPS: 39.908722, 116.397389 (±12m)
 *   高德导航: https://uri.amap.com/...
 *   电量78% · 4G
 */
export function buildLocationBlock(lat: number, lng: number, extras?: LocationExtras): string {
  if (lat === 0 && lng === 0) return "位置获取失败 / Location unavailable";

  // GPS coordinates + accuracy
  const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  const accuracy = extras?.accuracy != null
    ? ` (±${Math.round(extras.accuracy)}m)`
    : "";
  const coordLine = `GPS: ${coords}${accuracy}`;

  // Tappable Gaode navigation link (lng,lat order — Gaode convention)
  const navUrl =
    `https://uri.amap.com/marker?position=${lng.toFixed(6)},${lat.toFixed(6)}&name=求救位置`;
  const navLine = `导航: ${navUrl}`;

  // Device status (battery + network) — helps rescuers estimate connectivity
  const statusParts: string[] = [];
  if (extras?.battery != null) statusParts.push(`电量${extras.battery}%`);
  if (extras?.network)         statusParts.push(extras.network.toUpperCase());

  const lines = [coordLine, navLine];
  if (statusParts.length) lines.push(statusParts.join(" · "));

  return lines.join("\n");
}

/**
 * Build the SMS body from a template string.
 * The placeholder `{位置}` is replaced with the full location block.
 * Falls back to a default bilingual message if no template provided.
 */
export function buildSmsBody(
  lat: number,
  lng: number,
  template?: string,
  extras?: LocationExtras
): string {
  const locationBlock = buildLocationBlock(lat, lng, extras);

  if (template && template.trim()) {
    return template.replace(/\{位置\}/g, locationBlock);
  }

  // Default fallback (no template set)
  return (
    `我需要帮助，现在处境不安全。\n` +
    `${locationBlock}\n` +
    `请立即联系我，5分钟内无回应请代我报警。\n` +
    `I need help and I am not safe. ${locationBlock}. Call me back. If no answer in 5 min, call police for me.`
  );
}

/** Build an sms: URI that opens the native SMS app */
export function buildSmsUri(
  contact: EmergencyContact,
  lat: number,
  lng: number,
  template?: string,
  extras?: LocationExtras
): string {
  const body = encodeURIComponent(buildSmsBody(lat, lng, template, extras));
  return `sms:${contact.phone}?body=${body}`;
}

export function useEmergencyContacts() {
  const [contacts, setContacts] = useState<EmergencyContact[]>(() => loadContacts());

  const addContact = useCallback((name: string, phone: string): EmergencyContact => {
    const contact: EmergencyContact = {
      id: crypto.randomUUID(),
      name: name.trim(),
      phone: phone.trim(),
    };
    setContacts((prev) => {
      const next = [...prev, contact];
      saveContacts(next);
      return next;
    });
    return contact;
  }, []);

  const removeContact = useCallback((id: string) => {
    setContacts((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveContacts(next);
      return next;
    });
  }, []);

  return { contacts, addContact, removeContact };
}
