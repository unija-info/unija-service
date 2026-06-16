# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static site for **Unija Runner** — a searchable directory of student delivery service providers (runners) for a university community. Data is managed via Google Sheets and auto-synced to the repo every 5 minutes by GitHub Actions.

## Development

No build tools, no package manager, no compilation step. Serve locally with any static server:

```bash
python -m http.server
# Open http://localhost:8000
```

`runners.json` is required at the server root — `file://` won't work due to CORS when fetching it from JS.

## Architecture

```
index.html              ← Landing page: responsive grid of runner cards with live search
profile.html            ← Detail page: individual runner profile, receipt modal, WhatsApp link
form/status.html        ← Runner self-service status update page (embeds Google Form)
form/register.html      ← Runner registration/feedback form page (embeds Google Form)
script/form.gs          ← Google Apps Script: PIN validation + Current Status sheet update
card/                   ← Alternate card layout experiments (not in production flow)
runners.json            ← Auto-generated; single source of truth for frontend data
vercel.json             ← cleanUrls: true (URLs served without .html extension)
.github/workflows/sync.yml  ← Fetches Google Sheets CSVs → converts to JSON → commits
```

### Data Flow

```
Admin edits Google Sheets (main sheet)
    ↓ published CSV
Runner submits Google Form (Runner ID + PIN + status)
    ↓ onFormSubmit trigger (script/form.gs)
form.gs validates PIN against "PIN" tab in Google Sheets
    ↓ if valid, writes isActive to "Current Status" tab
GitHub Actions (sync.yml, triggered every 5 min via cron-job.org)
    ↓ fetches data.csv (main sheet) + current_status.csv (Current Status tab)
    ↓ merges isActive from current_status into main rows
runners.json  ←  never edit manually; overwritten on each sync
    ↓ fetch() in browser
index.html / profile.html
```

**Never manually edit `runners.json`** — it is overwritten by the Actions sync. Use the Google Sheet instead.

### PIN System — How It Actually Works

PIN validation happens entirely inside **Google Apps Script** (`script/form.gs`), not in `sync.yml`.

- PINs are stored in a **`PIN` tab** in the Google Spreadsheet (Column A = `runnerId`, Column B = PIN)
- When a runner submits the Google Form, `onFormSubmit` fires, reads the PIN tab, validates the submission, and if correct, writes `isActive` to the **`Current Status`** tab
- `sync.yml` reads the `Current Status` tab as a CSV and merges `isActive` — it performs **no PIN validation**
- Wrong PIN → silently ignored, status unchanged
- Form response rows are deleted immediately after processing (keeps the responses sheet clean)
- A `History` tab logs all valid submissions
- Latest valid submission per runner wins; if no submission exists, the main sheet's `isActive` value is used

To add/change a PIN: edit the **`PIN` tab** in the Google Spreadsheet. Share PINs privately with runners — never put them in a public file.

### Required Google Sheets Tabs

| Tab name | Purpose |
|---|---|
| Sheet1 (main) | Admin-managed runner records → published as `data.csv` |
| `PIN` | runnerId ↔ PIN mapping, read by `form.gs` |
| `Current Status` | `runnerId` + `isActive` pairs written by `form.gs` → published as `current_status.csv` |
| `History` | Append-only log of valid status submissions |
| Form Responses | Raw Google Form submissions — rows deleted by `form.gs` after processing |

### Data Schema

`runners.json` is a JSON array. Required fields (exact header names in Google Sheets):

| Field | Type | Notes |
|---|---|---|
| `runnerId` | string | Unique ID, e.g. `RN-2024-001`. Used in `?id=` URL param (case-insensitive match in profile.html) |
| `name` | string | Display name |
| `profilePic` | string | Image URL |
| `phone` | string | WhatsApp number with country code, digits only (no dashes/spaces) |
| `description` | string | Short bio; searchable on index grid |
| `isVerified` | `"TRUE"/"FALSE"` | String boolean from Sheets; shows Verified badge |
| `isActive` | `"TRUE"/"FALSE"` | Controls green pulse dot; overridden by form submission via `form.gs` |
| `isUniParcels` | `"TRUE"/"FALSE"` | Shows UniParcels badge on profile card |
| `isTest` | `"TRUE"/"FALSE"` | When TRUE, hidden from index grid; profile URL still accessible directly |
| `duration` | string | e.g. `Full Sem` |
| `validUntil` | string | Human-readable date; triggers "Tamat Tempoh" badge if past end of month |
| `registeredOn` | string | Format `D Mon YYYY` (e.g. `1 Jan 2024`). Shown as "Ahli Sejak" with Malay duration. Hidden if empty |
| `tags` | string | Comma-separated, e.g. `Beli Makanan, Parcels, 24 Jam` |
| `serviceDetails` | string | Markdown; rendered in receipt modal via marked.js |
| `availability` | string | Operating hours. Use ` \| ` to separate multiple schedules into separate lines. Hidden if empty |
| `kawasan` | string | Coverage area. Hidden if empty |
| `kriteriaP` | string | `Wanita`, `Lelaki`, or `Terbuka` (default). Displayed as customer gender criteria |

### Page Behaviour

- **`index.html`**: Loads `runners.json`, renders a card grid, filters by name/description via live search. Runners with `isTest === "TRUE"` are hidden. Card links go to `profile.html?id=[runnerId]`.
- **`profile.html`**: Reads `?id=` param with **case-insensitive matching**, finds runner, hydrates page. Renders `serviceDetails` as Markdown (marked.js). WhatsApp button uses `wa.me/{phone}`. Green pulse when `isActive === "TRUE"`. `availability` and `kawasan` rows hidden when empty.
- **`form/status.html`**: Embeds the Google Form for runners to update their own `isActive` status via PIN.
- **`form/register.html`**: Embeds a separate Google Form for runner registration/feedback.

## Key Patterns

- **String booleans**: `isVerified`, `isActive`, `isUniParcels`, `isTest` are `"TRUE"/"FALSE"` strings — compare with `=== "TRUE"` or `.toLowerCase() === 'true'`.
- **No framework**: All DOM manipulation is vanilla JS. No state management.
- **External CDNs**: Font Awesome 6.4.0, Google Fonts (Inter, Poppins), marked.min.js for Markdown.
- **Cache-busting**: Append `?v=${Date.now()}` when fetching `runners.json` to avoid stale data.
- **Clean URLs**: `vercel.json` sets `cleanUrls: true` — `/profile` serves `profile.html`, `/form/status` serves `form/status.html`.

### Tags Convention

`tags` is a comma-separated string. A runner can combine tags from multiple categories:

| Category | Values |
|---|---|
| Jenis Perkhidmatan | `Beli Makanan`, `Beli Barang`, `Hantar Barang`, `Parcels`, `Fotocopy / Print`, `Laundry`, `COD` |
| Had Perkhidmatan | `Perempuan Sahaja`, `Lelaki Sahaja` |
| Kawasan | `Dalam Kampus Sahaja`, `Dalam dan Luar Kampus` |
| Masa | `24 Jam`, `Waktu Siang`, `Waktu Malam`, `Hujung Minggu` |

Use `availability` for specific operating hour details. Separate multiple schedules with ` | ` on a single line — newlines are not supported.

## GitHub Actions Sync

`.github/workflows/sync.yml` requires **Read and write permissions** (`Settings → Actions → General → Workflow permissions`).

GitHub's built-in cron (`*/5 * * * *`) is unreliable and can be delayed by hours. A **cron-job.org** job triggers `workflow_dispatch` every 5 minutes via the GitHub API. If data is unchanged, the workflow skips the commit (`git commit || exit 0`).

The sync fetches two CSVs:
- **Main sheet** — hardcoded URL in `sync.yml`, admin-managed runner records
- **Current Status sheet** — hardcoded URL in `sync.yml`, written by `form.gs` after PIN validation

## Google Apps Script (`script/form.gs`)

Deployed as a bound script on the Google Spreadsheet. Requires an **installable `onFormSubmit` trigger** (not a simple trigger — must be set up manually in Apps Script editor under Triggers).

Key behaviour:
- Reads form values in order: `[timestamp, runnerId, pin, status]`
- Deletes the form response row immediately after reading it
- Validates PIN against the `PIN` tab; silently returns if wrong
- Updates the runner's row in `Current Status` tab, or appends a new row if not found
- Logs valid submissions to `History` tab

Google Form field labels must be exactly (case-sensitive): `Runner ID`, `PIN`, `Status`
`Status` must be a **multiple-choice** field with options exactly `Active` and `Not Active`.

**PIN tab gotcha**: Google Sheets auto-converts IDs like `001` to the number `1`. Format Column A as **Plain text** (`Format → Number → Plain text`) before entering IDs to preserve leading zeros.
