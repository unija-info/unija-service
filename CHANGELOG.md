# Changelog

All notable changes to Unija Runner are documented here.

---

## [v1.4.1] — 2026-05-18 — Test Profile Filtering

### Added

- `isTest` field (`"TRUE"/"FALSE"`) in Google Sheet — when TRUE, runner is excluded from the `index.html` grid and live search
- Filter applied in `loadRunners()` before populating `allRunners`, so search results are also clean
- Test profiles remain accessible via direct URL (`profile.html?id=xxx`) for admin/testing use

---

## [v1.4.0] — 2026-05-18 — Profile Redesign, New Fields & Sync Overhaul

### Added — `profile.html`

- **MAKLUMAT PERKHIDMATAN** section — new dedicated block above the info-grid displaying:
  - **Kriteria Pelanggan** — always shown; maps `kriteriaP` field values (`Wanita` → "Eksklusif untuk Wanita Sahaja", `Lelaki` → "Eksklusif untuk Lelaki Sahaja", `Terbuka` / fallback → "Terbuka kepada Semua")
  - **Kawasan** — shown only when field is non-empty; icon-prefixed row
  - **Waktu Operasi** — shown only when `availability` field is non-empty; supports ` | ` delimited line breaks rendered as `<br>`
- **MAKLUMAT RUNNER** section title — heading inside the info-grid above Duration and Valid Until
- **Ahli Sejak** (`registeredOn`) row — full-width third row inside the info-grid; hidden when field is empty; displays date + elapsed Malay duration in parentheses
- **`calcDuration(registeredOn)`** helper — calculates elapsed time from registration date:
  - Under 60 days → `{n} hari lepas`
  - 60 days to under 1 year → `{m} bulan {d} hari lepas` (days omitted if zero)
  - 1 year or more → `{y} tahun {m} bulan {d} hari lepas` (months/days omitted if zero)
- **Tamat Tempoh** expired badge — shown in `label-stack` below verification status when `validUntil` is past end-of-month
- **`isExpired(validUntil)`** helper — returns true if the end of the validity month has passed

### Added — `index.html`

- **Tamat Tempoh** mini badge on runner cards — shown below the UniParcels badge when registration is expired
- **`isExpired()`** helper function in grid rendering logic
- **`.expired-mini`** CSS class — red-tinted badge styled to match `.uniparcels-mini`

### Changed — `profile.html`

- Section order reorganised: Description → Tags → **Maklumat Perkhidmatan** → **Maklumat Runner** → Action buttons (Maklumat Runner moved below Maklumat Perkhidmatan)
- `kawasan` and `availability` rows migrated from standalone `info-grid` items into the new Maklumat Perkhidmatan block with icon prefixes
- Kriteria Pelanggan label text shortened for display: "Eksklusif untuk Wanita Sahaja" / "Eksklusif untuk Lelaki Sahaja" / "Terbuka kepada Semua"

### Added — Data Schema

- `kriteriaP` — new Google Sheets column for customer gender criteria (`Wanita` / `Lelaki` / `Terbuka`); separate from tags for explicit control
- `registeredOn` — new Google Sheets column; format `D Mon YYYY` (e.g. `1 Jan 2024`, `15 Mac 2025`)

---

## [v1.3.0] — 2026-05-18 — GitHub Actions Billing Fix & Sync Simplification

### Problem

GitHub Actions was failing with *"The job was not started because recent account payments have failed"*. Root cause: the `schedule` cron trigger on a **private repo** consumed paid Actions minutes, exhausting the free allowance.

### Changed — `.github/workflows/sync.yml`

- Removed `schedule` trigger entirely — workflow now only runs on `workflow_dispatch`
- Trigger source: external **cron-job.org** job calls the GitHub API every 5 minutes (free, reliable, no billing impact)
- Removed PIN validation logic from the Python conversion step — responsibility moved to Google Apps Script (server-side, before data reaches the repo)
- Removed `Fetch Status Form Responses` step and associated CSV parsing
- Replaced with `Fetch Current Status` step — fetches a separate `Current Status` sheet (columns: `runnerId`, `isActive`) published as CSV
- Python now merges `isActive` from Current Status sheet into main runner rows; skips runner if no matching entry exists
- Removed `Write Pins` step — `pins.json` no longer written from secrets

### Removed

- `pins.json` — deleted from the repository; sensitive PIN data moved to a protected Google Sheet tab accessible only to admins

### Security

- PINs are no longer stored in any file committed to the repository
- Apps Script validates PINs against the protected `PIN` sheet tab server-side; only validated status values are written to the `Current Status` sheet
- Form responses are moved to a `History` sheet tab after processing, keeping the `Form Responses 1` sheet clean and small

### Pending (manual setup required)

- Publish the `Current Status` Google Sheet tab as CSV and replace the `CURRENT_STATUS_CSV_URL` placeholder in `sync.yml`
- Set up Apps Script `onFormSubmit` installable trigger (requires authorization to delete/move rows)
- Consider making the repo **public** to eliminate Actions billing concerns entirely (requires confirming no sensitive data remains in the repo)

---

## [v1.2.0] — 2026-05-10 — Runner Self-Update, Availability & UI Polish

### Added — Runner Status Self-Update (PIN System)

- Runners can toggle their own `isActive` status via a Google Form without admin access
- `pins.json` — PIN store in repo root, keyed by `runnerId` (e.g. `{"RN-2024-001": "4521"}`)
- `sync.yml` extended: fetches form responses CSV, validates PIN per runner, merges `isActive` into output JSON; latest valid submission per runner wins; wrong PIN submissions silently ignored
- Google Form fields: `Runner ID` (short answer), `PIN` (short answer), `Status` (Active / Not Active)

### Added — `profile.html`

- `availability` field support — separate row shown only when non-empty; ` | ` delimited values rendered as line breaks
- `kawasan` field support — separate row shown only when non-empty

### Changed — UI

- index.html: responsive grid changed to 2 columns on mobile, 3 on tablet (≥480px), auto-fill on desktop (≥768px)
- index.html: header updated to "Unija Runners" with subheading "Verified delivery services on campus"
- profile.html: WhatsApp button text changed from "Hire Now" → "Get Started"
- profile.html: button text previously changed from "Order Now" → "Hire Now" (same release cycle)

### Added — Documentation

- `README.md` enhanced with full system architecture and service connection documentation
- `CLAUDE.md` updated with schema, patterns, and PIN system documentation

---

## [v1.1.1] — 2026-05-09 — Profile Link Fix

### Changed

- Runner card links in `index.html` updated from `profile.html?id=` to `profile?id=` for consistency with server routing (no `.html` extension)

---

## [v1.1.0] — 2026-05-07 — UniParcels Indicators & Initial Documentation

### Added

- **UniParcels** indicator on `profile.html` — gold pill badge (`🎓 UniParcels`) shown when `isUniParcels === "TRUE"`
- **UniParcels** mini badge on `index.html` runner cards — amber-tinted label below the runner name
- `isUniParcels` field added to data schema (`"TRUE"/"FALSE"` string boolean from Sheets)
- `README.md` — project overview, architecture diagram, data flow, and setup instructions
- `CLAUDE.md` — developer guidelines, key patterns, schema reference, and sensitive file list

### Changed

- Profile layout refactored to accommodate UniParcels pill in `label-stack` without breaking verified/unverified badge

---

## [v1.0.0] — 2026-05-07 — Initial Release

### Added

- `index.html` — searchable directory of runner cards; live search filters by name and description; 2-column responsive grid
- `profile.html` — individual runner profile card with:
  - Profile photo, name, runner ID badge
  - Verified / Unverified label
  - Active status pulsing dot
  - Tags row
  - Duration and Valid Until info grid
  - Service Details receipt modal (Markdown rendered via marked.js)
  - WhatsApp deep link button
- `runners.json` — auto-generated JSON array; single source of truth for frontend data; never edited manually
- `.github/workflows/sync.yml` — GitHub Actions workflow:
  - Fetches main Google Sheets CSV (runner directory)
  - Converts CSV to `runners.json` via Python `csv.DictReader`
  - Commits and pushes if data changed
  - Scheduled every 5 minutes via `schedule` cron (later removed — see 2026-05-18 entry)

### Data Schema (initial fields)

| Field | Type | Notes |
|---|---|---|
| `runnerId` | string | Unique ID, e.g. `RN-2024-001` |
| `name` | string | Display name |
| `profilePic` | string | Image URL |
| `phone` | string | WhatsApp number with country code |
| `description` | string | Short bio |
| `isVerified` | `"TRUE"/"FALSE"` | String boolean from Sheets |
| `isActive` | `"TRUE"/"FALSE"` | Online status dot |
| `duration` | string | e.g. `Full Sem` |
| `validUntil` | string | Human-readable expiry date |
| `tags` | string | Comma-separated service tags |
| `serviceDetails` | string | Markdown; rendered in receipt modal |
