import { describe, expect, it } from "vitest";
import { sealJson } from "./keyVault";
import {
  decryptRecordDraft,
  encryptRecordDraftPayload,
  recordDraftHasContent,
  RECORD_DRAFT_SCHEMA_VERSION,
  type EncryptedRecordDraft,
  type RecordDraftPayload,
} from "./recordDraftService";

async function createMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

describe("encrypted record drafts", () => {
  it("encrypts and opens the complete payload without plaintext metadata", async () => {
    const key = await createMasterKey();
    const payload: RecordDraftPayload = {
      schemaVersion: RECORD_DRAFT_SCHEMA_VERSION,
      draftId: "b88f07c5-81d1-4327-bd60-eeb6ba15bd7b",
      situationId: "assault",
      notes: { safetyNow: "A trusted person is with me." },
      createdAt: "2026-10-12T10:00:00.000Z",
      updatedAt: "2026-10-12T10:01:00.000Z",
    };
    const encrypted = await encryptRecordDraftPayload(key, payload);
    expect(encrypted.ciphertext).not.toContain(payload.situationId);
    expect(encrypted.ciphertext).not.toContain(payload.notes.safetyNow);
    expect(encrypted.ciphertextHash).toMatch(/^[0-9a-f]{64}$/);

    const record: EncryptedRecordDraft = {
      localKey: `user:${payload.draftId}`,
      userId: "user",
      draftId: payload.draftId,
      schemaVersion: RECORD_DRAFT_SCHEMA_VERSION,
      ...encrypted,
      revision: 1,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      expiresAt: "2026-11-11T10:01:00.000Z",
      syncStatus: "local-only",
    };
    await expect(decryptRecordDraft(record, key)).resolves.toEqual(payload);
  });

  it("rejects ciphertext whose integrity hash was changed", async () => {
    const key = await createMasterKey();
    const payload: RecordDraftPayload = {
      schemaVersion: RECORD_DRAFT_SCHEMA_VERSION,
      draftId: "d2695744-a54f-460b-8746-5b3ae89f54cf",
      situationId: "stalking",
      notes: { pattern: "Repeated calls" },
      createdAt: "2026-10-12T10:00:00.000Z",
      updatedAt: "2026-10-12T10:01:00.000Z",
    };
    const encrypted = await encryptRecordDraftPayload(key, payload);
    const record: EncryptedRecordDraft = {
      localKey: `user:${payload.draftId}`,
      userId: "user",
      draftId: payload.draftId,
      schemaVersion: RECORD_DRAFT_SCHEMA_VERSION,
      ...encrypted,
      ciphertextHash: "0".repeat(64),
      revision: 1,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      expiresAt: "2026-11-11T10:01:00.000Z",
      syncStatus: "local-only",
    };
    await expect(decryptRecordDraft(record, key)).rejects.toThrow("draft-integrity-check-failed");
  });

  it("rejects a valid ciphertext bound to a different draft id", async () => {
    const key = await createMasterKey();
    const payload: RecordDraftPayload = {
      schemaVersion: RECORD_DRAFT_SCHEMA_VERSION,
      draftId: "194a723d-2a6e-40e8-9287-285c8282d674",
      situationId: "memory-gap",
      notes: { lastClear: "At the station" },
      createdAt: "2026-10-12T10:00:00.000Z",
      updatedAt: "2026-10-12T10:01:00.000Z",
    };
    const ciphertext = await sealJson(key, payload);
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ciphertext));
    const ciphertextHash = Array.from(new Uint8Array(hash))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const record: EncryptedRecordDraft = {
      localKey: "user:other-id",
      userId: "user",
      draftId: "other-id",
      schemaVersion: RECORD_DRAFT_SCHEMA_VERSION,
      ciphertext,
      ciphertextHash,
      revision: 1,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      expiresAt: "2026-11-11T10:01:00.000Z",
      syncStatus: "local-only",
    };
    await expect(decryptRecordDraft(record, key)).rejects.toThrow("draft-schema-invalid");
  });

  it("treats whitespace-only fields as empty", () => {
    expect(recordDraftHasContent({ first: "  ", second: undefined })).toBe(false);
    expect(recordDraftHasContent({ first: " remembered detail " })).toBe(true);
  });
});
