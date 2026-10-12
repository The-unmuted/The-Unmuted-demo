import { afterEach, describe, expect, it, vi } from "vitest";
import {
  configureRecordDraftCloudAdapter,
  createRestRecordDraftCloudAdapter,
  getRecordDraftCloudAdapter,
  isRecordDraftCloudConfigured,
  type CloudRecordDraft,
  type RecordDraftCloudAdapter,
} from "./recordDraftCloud";

const validDraft: CloudRecordDraft = {
  draftId: "draft/one",
  schemaVersion: 1,
  ciphertext: "encrypted-envelope",
  ciphertextHash: "a".repeat(64),
  revision: 2,
  createdAt: "2026-10-12T10:00:00.000Z",
  updatedAt: "2026-10-12T10:01:00.000Z",
  expiresAt: "2026-11-11T10:01:00.000Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createAdapter(fetchImpl: typeof fetch) {
  return createRestRecordDraftCloudAdapter({
    baseUrl: "https://api.example.test",
    getAccessToken: async () => "short-lived-token",
    getAuthenticatedUserId: async () => "account-123",
    fetchImpl,
  });
}

afterEach(() => {
  configureRecordDraftCloudAdapter(null);
  vi.restoreAllMocks();
});

describe("record draft cloud adapter", () => {
  it("rejects plaintext HTTP except on localhost", () => {
    expect(() =>
      createRestRecordDraftCloudAdapter({
        baseUrl: "http://api.example.test",
        getAccessToken: async () => "token",
        getAuthenticatedUserId: async () => "account",
      })
    ).toThrow("record-draft-api-must-use-https");

    expect(() =>
      createRestRecordDraftCloudAdapter({
        baseUrl: "http://127.0.0.1:8787",
        getAccessToken: async () => "token",
        getAuthenticatedUserId: async () => "account",
      })
    ).not.toThrow();
  });

  it("lists valid ciphertext drafts and filters malformed rows", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        drafts: [validDraft, { ...validDraft, ciphertextHash: "invalid" }, null],
      })
    );
    const adapter = createAdapter(fetchMock);

    await expect(adapter.listDrafts()).resolves.toEqual([validDraft]);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/v1/record-drafts");
    expect(init?.credentials).toBe("omit");
    expect(init?.cache).toBe("no-store");
    expect(init?.referrerPolicy).toBe("no-referrer");
    expect(init?.headers).toMatchObject({
      Accept: "application/json",
      Authorization: "Bearer short-lived-token",
    });
    expect(String(url)).not.toContain("account-123");
  });

  it("does not call the network without an access token", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const adapter = createRestRecordDraftCloudAdapter({
      baseUrl: "https://api.example.test",
      getAccessToken: async () => null,
      getAuthenticatedUserId: async () => null,
      fetchImpl: fetchMock,
    });

    await expect(adapter.listDrafts()).rejects.toThrow("record-draft-cloud-unauthorized");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([401, 403])("maps a %s response to an authorization error", async (status) => {
    const adapter = createAdapter(vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, status)));
    await expect(adapter.listDrafts()).rejects.toThrow("record-draft-cloud-unauthorized");
  });

  it("surfaces other HTTP status codes without response contents", async () => {
    const adapter = createAdapter(vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 503)));
    await expect(adapter.listDrafts()).rejects.toThrow("record-draft-cloud-503");
  });

  it("sends only the encrypted draft payload when upserting", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const adapter = createAdapter(fetchMock);

    await adapter.upsertDraft(validDraft);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/v1/record-drafts/draft%2Fone");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(String(init?.body))).toEqual(validDraft);
    expect(String(init?.body)).not.toContain("account-123");
  });

  it("URL-encodes the draft id when deleting", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    const adapter = createAdapter(fetchMock);

    await adapter.deleteDraft("draft/with spaces");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.example.test/v1/record-drafts/draft%2Fwith%20spaces"
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });

  it("can install and remove a provider-neutral adapter", () => {
    const adapter = {
      getAuthenticatedUserId: async () => "account",
      listDrafts: async () => [],
      upsertDraft: async () => undefined,
      deleteDraft: async () => undefined,
    } satisfies RecordDraftCloudAdapter;

    expect(isRecordDraftCloudConfigured()).toBe(false);
    configureRecordDraftCloudAdapter(adapter);
    expect(isRecordDraftCloudConfigured()).toBe(true);
    expect(getRecordDraftCloudAdapter()).toBe(adapter);
    configureRecordDraftCloudAdapter(null);
    expect(isRecordDraftCloudConfigured()).toBe(false);
    expect(getRecordDraftCloudAdapter()).toBeNull();
  });
});
