/**
 * Emergency contacts — localStorage-based management + SMS URI builder.
 *
 * Contacts are stored locally only. On SOS trigger the app opens the
 * native SMS app pre-filled with a bilingual help message.
 */

import { useState, useCallback } from "react";

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
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

/** 高德地图链接（经度,纬度）— 国内可直接访问 */
export function buildMapLink(lat: number, lng: number): string {
  if (lat === 0 && lng === 0) return "https://m.amap.com";
  return `https://uri.amap.com/marker?position=${lng.toFixed(6)},${lat.toFixed(6)}&name=求救位置`;
}

/**
 * Build the SMS body from a template string.
 * The placeholder `{位置}` in the template is replaced with the Gaode map link.
 * Falls back to a default bilingual message if no template provided.
 */
export function buildSmsBody(lat: number, lng: number, template?: string): string {
  const mapLink = buildMapLink(lat, lng);

  if (template && template.trim()) {
    return template.replace(/\{位置\}/g, mapLink);
  }

  // Default fallback (no template set)
  return (
    `我需要帮助，现在处境不安全。\n` +
    `位置：${mapLink}\n` +
    `请立即联系我，5分钟内无回应请代我报警。\n` +
    `I need help and I am not safe. Location: ${mapLink}. Call me back. If no answer in 5 min, call police for me.`
  );
}

/** Build an sms: URI that opens the native SMS app */
export function buildSmsUri(contact: EmergencyContact, lat: number, lng: number, template?: string): string {
  const body = encodeURIComponent(buildSmsBody(lat, lng, template));
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
