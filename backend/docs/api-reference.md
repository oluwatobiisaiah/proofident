# Proofident Backend API Reference

This document covers the current Node backend HTTP surface in `backend/src/routes`.

## Base URL

- Local: `http://localhost:3000`
- Authenticated routes expect `Authorization: Bearer <accessToken>`

## Conventions

- Content type: `application/json`
- All `POST`, `PUT`, and `PATCH` requests may include `Idempotency-Key`, except webhook routes. If the same key is reused with a different body, the API returns `409 IDEMPOTENCY_MISMATCH`.
- Validation errors return:

```json
{
  "error": "Invalid request payload",
  "code": "VALIDATION_ERROR",
  "details": {}
}
```

- Application errors return:

```json
{
  "error": "Human readable message",
  "code": "APP_SPECIFIC_CODE",
  "details": null
}
```

- Unhandled failures return:

```json
{
  "error": "Internal Server Error",
  "code": "INTERNAL_SERVER_ERROR"
}
```

## Onboarding Flow (Complete Sequence)

1. `POST /auth/send-otp` — sends OTP to phone (dev: OTP returned in `devOtp`)
2. `POST /auth/verify-otp` — creates or logs in user, returns `accessToken` + `refreshToken`
3. `POST /auth/bvn/initiate` — starts BVN verification (dev mode: returns fake session)
4. `POST /auth/verify-bvn` — verifies BVN OTP, auto-populates `name` and `dateOfBirth` on user
5. `PATCH /me` — set `email` (required for Mono Connect) and optionally `state`, `occupation`, `monthlyIncome`
6. Squad settlement account is **auto-provisioned** immediately after BVN verification succeeds — no extra call needed
7. Connect data: either `POST /me/data-sources/connect/initiate` (mobile money) or the betting upload flow

## Auth Flow (Token Refresh)

1. `POST /auth/send-otp`
2. `POST /auth/verify-otp`
3. Save `accessToken`, `refreshToken`, and `user.id`
4. Use `Authorization: Bearer {{accessToken}}`
5. When the access token expires, call `POST /auth/refresh-token`

## Route Groups

### Health

`GET /health`

- Auth: none
- Returns service health plus database and Redis checks.
- Success: `200` when healthy, `503` when degraded.

### Authentication

`POST /auth/send-otp`

- Auth: none
- Body: `{ "phone": "08012345678" }`
- Success: `{ success, phone, otp, expiresAt }`
- Common errors:
  - `429 OTP_RESEND_COOLDOWN`

`POST /auth/verify-otp`

- Auth: none
- Body: `{ "phone": "08012345678", "otp": "123456" }`
- Success: `{ success, user, accessToken, refreshToken }`
- Common errors:
  - `400 OTP_NOT_FOUND`
  - `400 OTP_EXPIRED`
  - `400 OTP_INVALID`
  - `429 OTP_ATTEMPTS_EXCEEDED`

`POST /auth/bvn/initiate`

- Auth: required
- Body: `{ "bvn": "12345678901" }`
- Success: `{ success, sessionId, methods, expiresAt }`
- Common errors:
  - `404 USER_NOT_FOUND`

`POST /auth/verify-bvn`

- Auth: required
- Body: `{ "sessionId": "<uuid>", "otp": "123456", "method": "sms", "dateOfBirth": "1995-01-31" }`
- Success: `{ success, user }`
- Common errors:
  - `400 BVN_SESSION_INVALID`
  - `400 BVN_VERIFICATION_FAILED`
  - `400 BVN_DOB_MISMATCH`
  - `404 USER_NOT_FOUND`

`POST /auth/refresh-token`

- Auth: none
- Body: `{ "refreshToken": "<jwt>" }`
- Success: `{ success, accessToken, refreshToken }`
- Common errors:
  - `401 REFRESH_TOKEN_INVALID`
  - `401 REFRESH_SESSION_INVALID`

`POST /auth/logout`

- Auth: none
- Body: `{ "refreshToken": "<jwt>" }`
- Success: `{ success: true }`
- Notes: logout is tolerant of missing or already-invalid refresh tokens.

### User Profile And Overview

`GET /me`

- Auth: required
- Success: `{ user, latestScore, flags }`

`PATCH /me`

- Auth: required
- Body (all fields optional): `{ "email": "user@example.com", "name": "Tunde Adeyemi", "state": "Lagos", "occupation": "self_employed", "monthlyIncome": 150000 }`
- Success: `{ success, user }`
- Notes:
  - `name` is auto-populated from BVN verification but can be corrected here.
  - `email` must be set before linking a mobile money account via Mono Connect.
  - `monthlyIncome` is in kobo.

`GET /me/timeline`

- Auth: required
- Success: `{ userId, events }`

`GET /me/risk-flags`

- Auth: required
- Success: `{ flags }`

`GET /me/data-sources`

- Auth: required
- Success: `{ dataSources }`

### Betting Provider Catalog

`GET /me/data-sources/betting/providers`

- Auth: required
- Success: `{ providers }`
- Current extraction-focused providers: `sportybet`, `bet9ja`, `1xbet`

### Betting Data — Two Paths

**Path A: OCR/Screenshot extraction (full AI pipeline)**

This is the multi-step flow for uploading screenshots or CSV files and letting the ML service extract records.

1. `POST /me/data-sources/betting/upload-sessions` — create session, get Cloudinary signed upload params
2. Upload file(s) directly to Cloudinary using the returned `uploads[*]` params (see note below)
3. `POST /me/data-sources/betting/upload-sessions/:id/complete` — tell backend the upload is done
4. Poll `GET /me/data-sources/betting/ingestions/:id/review` until extraction completes
5. Review/edit/confirm staged records
6. `POST /me/data-sources/betting/ingestions/:id/finalize` — import confirmed records → triggers score

**How to upload to Cloudinary in step 2:**
Use a `multipart/form-data` POST to `uploads[0].uploadUrl` with these fields:
- `file` — the actual file binary
- `api_key` — from `uploads[0].apiKey`
- `timestamp` — from `uploads[0].timestamp`
- `folder` — from `uploads[0].folder`
- `public_id` — from `uploads[0].publicId`
- `signature` — from `uploads[0].signature`

Cloudinary returns a JSON body; use `secure_url` as the `publicUrl` in step 3.

**Path B: Direct JSON import (simpler, good for demos and testing)**

Skip Cloudinary entirely. Just POST normalized JSON records directly:

- `POST /me/data-sources/manual-import/betting` — import JSON betting records, triggers score immediately
- `POST /me/data-sources/manual-import/mobile-money` — import JSON mobile money records, triggers score immediately

No file upload, no review step, records go straight into the canonical tables.

---

### Betting Upload, Extraction, Review, Finalize (Path A)

`POST /me/data-sources/betting/upload-sessions`

- Auth: required
- Body:

```json
{
  "providerCode": "1xbet",
  "uploadKind": "csv",
  "files": [
    {
      "originalFilename": "history.csv",
      "mimeType": "text/csv",
      "fileSizeBytes": 20480,
      "checksumSha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "uploadOrder": 0
    }
  ]
}
```

- Success: `{ success, dataSourceId, ingestionSessionId, uploadKind, uploads }`
- Common errors:
  - `400 BETTING_PROVIDER_UNSUPPORTED`
  - `400 BETTING_CSV_PROVIDER_UNSUPPORTED`
  - `400 BETTING_UPLOAD_FILES_REQUIRED`

`POST /me/data-sources/betting/upload-sessions/:ingestionSessionId/complete`

- Auth: required
- Body:

```json
{
  "files": [
    {
      "uploadFileId": "<uuid>",
      "publicUrl": "https://res.cloudinary.com/demo/raw/upload/sample.csv",
      "storageObjectKey": "proofident/user/file",
      "mimeType": "text/csv",
      "fileSizeBytes": 20480
    }
  ]
}
```

- Success: `{ success, ingestionSessionId, extractionJobId, queued }`
- Common errors:
  - `404 BETTING_INGESTION_NOT_FOUND`
  - `404 BETTING_UPLOAD_FILE_NOT_FOUND`
  - `500 BETTING_EXTRACTION_JOB_CREATE_FAILED`

`GET /me/data-sources/betting/ingestions/:ingestionSessionId/review`

- Auth: required
- Success: `{ success, ingestionSession, dataSource, uploads, extractionJobs, summary, records }`
- Notes:
  - `summary.statusBreakdown` groups staged records by status.
  - `records` include confidence, validation issues, parser metadata, and reviewer notes.

`POST /me/data-sources/betting/ingestions/:ingestionSessionId/review/records/:stagedRecordId`

- Auth: required
- Body:

```json
{
  "action": "edit",
  "patch": {
    "transactionDate": "2026-05-14T09:15:00.000Z",
    "betAmount": 1500,
    "odds": 2.4,
    "outcome": "win",
    "payoutAmount": 3600,
    "league": "Premier League",
    "eventName": "Arsenal vs Chelsea"
  },
  "notes": "Adjusted OCR output after manual review"
}
```

- Success: `{ success, record }`
- Common errors:
  - `404 BETTING_INGESTION_NOT_FOUND`
  - `404 BETTING_STAGED_RECORD_NOT_FOUND`
  - `400 BETTING_REVIEW_INVALID_AMOUNT`
  - `400 BETTING_REVIEW_INVALID_PAYOUT`
  - `400 BETTING_REVIEW_INVALID_ODDS`
  - `400 BETTING_REVIEW_INVALID_DATE`
  - `400 BETTING_REVIEW_INVALID_SETTLED_DATE`

`POST /me/data-sources/betting/ingestions/:ingestionSessionId/review/bulk-confirm`

- Auth: required
- Body: `{ "stagedRecordIds": ["<uuid>"] }`
- Success: `{ success, updatedCount }`
- Notes:
  - If `stagedRecordIds` is omitted, the backend confirms all `pending_review` rows that have no validation issues.

`POST /me/data-sources/betting/ingestions/:ingestionSessionId/finalize`

- Auth: required
- Success: `{ success, ingestionSessionId, importedRecordCount, duplicateCanonicalRecordCount, scoreDispatch }`
- Common errors:
  - `400 BETTING_NO_CONFIRMED_RECORDS`
  - `404 BETTING_INGESTION_NOT_FOUND`
  - `404 BETTING_DATA_SOURCE_NOT_FOUND`
- Notes:
  - Imports only confirmed staged rows.
  - Deduplicates against canonical betting history.
  - Triggers asynchronous score recalculation, with sync fallback inside the service.

### Data Source Linking And Manual Imports

`POST /me/data-sources/connect/initiate`

- Auth: required
- Body: `{ "sourceType": "mobile_money", "providerCode": "opay" }`
- Success: `{ success, link }`

`POST /me/data-sources/connect/complete`

- Auth: required
- Body: `{ "sourceType": "mobile_money", "providerCode": "opay", "code": "mono-code" }`
- Success: `{ success, ...result }`

`POST /me/data-sources/imports/betting/provider`

- Auth: required
- Body accepts provider payload in `csv` or `json` form.
- Success: `{ success, normalizedRecords, ...result }`
- Notes:
  - This is separate from the staged OCR flow.
  - Intended for direct provider payload normalization/import.

`POST /me/data-sources/manual-import/betting`

- Auth: required
- Body includes an array of normalized betting records.
- Success: `{ success, ...result }`

`POST /me/data-sources/manual-import/mobile-money`

- Auth: required
- Body includes an array of mobile money records.
- Success: `{ success, ...result }`

`POST /me/data-sources/:sourceId/sync`

- Auth: required
- Success: `{ success, ...result }`
- Notes: used for supported mobile money sync refresh.

`GET /me/data-sources/:sourceId/ingestion`

- Auth: required
- Success: `{ ingestion }`

### Uploads And Generic Ingestions

`POST /me/uploads/presign`

- Auth: required
- Body: `{ "sourceType": "betting" }`
- Success: `{ uploadId, sourceType, method, uploadUrl }`

`POST /me/ingestions`

- Auth: required
- Body:

```json
{
  "sourceType": "betting",
  "ingestionMethod": "manual_upload",
  "dataSourceId": "<uuid>"
}
```

- Success: `{ ingestion }`

`GET /ingestions/:id`

- Auth: required
- Success: `{ ingestion }`
- Common errors:
  - `404 INGESTION_NOT_FOUND`

### Scores

`GET /me/score`

- Auth: required
- Success: `{ score }`

`GET /me/score/status`

- Auth: required
- Success when no score exists:

```json
{
  "status": "not_started",
  "reason": "No score generated yet."
}
```

- Success when ready:

```json
{
  "status": "ready",
  "generatedAt": "2026-05-14T10:00:00.000Z",
  "expiresAt": "2026-06-13T10:00:00.000Z",
  "confidenceLevel": "medium",
  "completenessTier": "tier_1"
}
```

`POST /me/score/recalculate`

- Auth: required
- Success: `{ success, score }`
- Notes: service attempts ML-backed scoring and falls back to rule-based recalculation if needed.

### Jobs

`GET /me/jobs`

- Auth: required
- Success: `{ matches }`
- Notes: each match includes its linked `job` object when found.

`GET /me/applications`

- Auth: required
- Success: `{ applications }`

`GET /jobs/:id`

- Auth: none
- Success: `{ job }`
- Common errors:
  - `404 JOB_NOT_FOUND`

`POST /jobs/:id/apply`

- Auth: required
- Body: `{ "needsLoan": true }`
- Success: `{ success, application }`
- Common errors:
  - `400 JOB_NOT_MATCHED`
  - `404 JOB_NOT_FOUND` may surface indirectly if the path id is malformed or downstream checks fail

### Loans

`GET /me/loan-offers`

- Auth: required
- Success: `{ offers }`
- Common errors:
  - `400 LOAN_OFFERS_UNAVAILABLE`

`POST /loans/apply`

- Auth: required
- Body: `{ "jobId": "<uuid>", "requestedAmount": 200000 }`
- Success: `{ success, loan, repayments }`
- Common errors:
  - `400 LOAN_CONTEXT_MISSING`
  - `400 JOB_ACCEPTANCE_REQUIRED`
  - `400 LOAN_POLICY_REJECTED`
  - `400 LOAN_AFFORDABILITY_REJECTED`
  - `400 EMPLOYER_SETTLEMENT_MISSING`
  - `500 LOAN_CREATE_FAILED`

`GET /me/loans`

- Auth: required
- Success: `{ loans }`

`GET /me/income`

- Auth: required
- Success: `{ income }`

`GET /loans/:id`

- Auth: required
- Success: `{ loan, repayments }`
- Common errors:
  - `403 AUTH_FORBIDDEN`
  - `404 LOAN_NOT_FOUND`

### Webhooks And Replay

`POST /webhooks/squad`

- Auth: none
- Headers: `x-squad-signature`
- Success: `{ success, queued, result }`
- Common errors:
  - `401 Invalid signature`
- Notes:
  - Idempotency middleware is intentionally skipped for webhook routes.
  - Raw body is used for signature verification.

`POST /demo/events/:type`

- Auth: none
- Availability: non-production only
- Body: `{ "userId": "<uuid>", "loanId": "<uuid>" }`
- Success: `{ success, result }`
- In production: `404 Not found`

### Demo Routes

These routes are registered only when `ENABLE_DEMO_ROUTES=true` and `NODE_ENV !== production`.

`POST /demo/bootstrap`

- Auth: required
- Success: `{ success, ...result }`

`GET /demo/users/:id/snapshot`

- Auth: required
- Success: snapshot payload from `decisionEngineService.getUserSnapshot`

## Postman Notes

- Import `backend/docs/postman/proofident-backend.postman_collection.json`
- Import `backend/docs/postman/proofident-local.postman_environment.json`
- Run `Auth > Verify OTP` first; the collection stores `accessToken`, `refreshToken`, and `userId`
- For staged betting flow:
  1. `Create Upload Session`
  2. Upload files to Cloudinary using the returned `uploads`
  3. `Complete Upload Session`
  4. `Get Review Session`
  5. `Review Record` or `Bulk Confirm`
  6. `Finalize Confirmed Records`
