# Encrypted record-draft cloud API

The draft client is provider-neutral. The demo configures no cloud adapter and
keeps every draft encrypted on the current device. This contract is for the
official version after real account sign-in and a production backend exist.

Tencent CloudBase HTTP functions are the recommended first implementation
because the project already uses CloudBase for hosting. A same-origin API is
preferred where possible: it avoids extra CORS and CSP configuration. If a
separate origin is required, add only that exact HTTPS origin to `connect-src`.

## Authentication and ownership

Every route requires `Authorization: Bearer <short-lived-access-token>`.

The server must validate the token and derive the stable account ID from it.
It must never accept an owner/user ID from a URL, query parameter, header, or
request body. Every read, write, and delete must be scoped to that derived
account ID.

## Routes

### List drafts

```http
GET /v1/record-drafts
Authorization: Bearer <token>
```

```json
{
  "drafts": [
    {
      "draftId": "opaque-id",
      "schemaVersion": 1,
      "ciphertext": "aes-gcm-envelope",
      "ciphertextHash": "64-character-sha256-hex",
      "revision": 3,
      "createdAt": "2026-10-12T10:00:00.000Z",
      "updatedAt": "2026-10-12T10:03:00.000Z",
      "expiresAt": "2026-11-11T10:03:00.000Z"
    }
  ]
}
```

### Create or update a draft

```http
PUT /v1/record-drafts/:draftId
Authorization: Bearer <token>
Content-Type: application/json
```

The JSON body is one draft object from the list response and contains no user
ID. The path ID and body `draftId` must match. The server should implement an
idempotent, revision-safe upsert: accept a higher revision, treat an identical
revision/payload as success, and never replace a higher stored revision with a
lower one.

### Delete a draft

```http
DELETE /v1/record-drafts/:draftId
Authorization: Bearer <token>
```

Deleting a missing draft should be idempotent and return success.

## Required server controls

- HTTPS only; reject missing, invalid, expired, or wrong-audience tokens.
- Store only the fields shown above plus the server-derived owner ID.
- Validate field lengths, schema version, SHA-256 format, revision, and dates.
- Limit ciphertext size and rate-limit requests per account and IP.
- Scope every database query by authenticated owner before draft ID.
- Never log access tokens, ciphertext, request bodies, decrypted content, or
  situation metadata. Return generic errors.
- Delete expired records on reads and with a scheduled daily cleanup.
- Encrypt databases and backups at rest and define backup deletion retention.
- Audit authorization failures and destructive actions without sensitive data.
- Test isolation with at least two accounts before production release.

## Client activation

After official sign-in has both a stable account ID and a short-lived token:

```ts
const adapter = createRestRecordDraftCloudAdapter({
  baseUrl: "/api",
  getAccessToken: () => auth.getAccessToken(),
  getAuthenticatedUserId: () => auth.getUserId(),
});

configureRecordDraftCloudAdapter(adapter);
```

After logout, call `configureRecordDraftCloudAdapter(null)` and clear the
in-memory vault key. Existing encrypted local drafts remain on-device until
their retention period ends or the user permanently deletes them.
