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
index.html          ← Landing page: responsive grid of runner cards with live search
profile.html        ← Detail page: individual runner profile, receipt modal, WhatsApp link
card/               ← Alternate card layout experiments (not in production flow)
runners.json        ← Auto-generated; single source of truth for frontend data
.github/workflows/sync.yml  ← Fetches Google Sheets CSV → converts to JSON → commits
```

### Data Flow

```
Google Sheets (CMS, headers case-sensitive)
    ↓ published CSV URL
GitHub Actions (sync.yml, runs every 5 min)
    ↓ Python csv.DictReader → JSON
runners.json  ←  never edit manually; overwritten on each sync
    ↓ fetch() in browser
index.html / profile.html
```

**Never manually edit `runners.json`** — it is overwritten by the Actions sync. Use the Google Sheet instead.

### Data Schema

`runners.json` is a JSON array. Required fields (exact header names in Google Sheets):

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
| `validUntil` | string | Human-readable date |
| `tags` | string | Comma-separated, e.g. `Beli Makanan, Parcels, 24 Jam` |
| `serviceDetails` | string | Markdown; rendered in receipt modal |
| `availability` | string | Free-text operating hours; displayed as "Availability" on profile. Use ` \| ` to separate multiple schedules into separate lines. Hidden if empty. |
| `kawasan` | string | Coverage area; displayed as "Kawasan" on profile. e.g. `Dalam Kampus Sahaja`. Hidden if empty. |

### Page Behaviour

- **`index.html`**: Loads `runners.json`, renders a card grid, filters by name/description via live search. Card links go to `profile.html?id=[runnerId]`.
- **`profile.html`**: Reads `?id=` URL param, finds matching runner, hydrates the page. Renders `serviceDetails` as Markdown (marked.js CDN). WhatsApp button uses `wa.me/{phone}?text=...`. Green pulsing dot shown when `isActive === "TRUE"`. `availability` row shown only when field is non-empty.

## Key Patterns

- **String booleans**: `isVerified` and `isActive` are `"TRUE"/"FALSE"` strings (from Sheets CSV), not JS booleans — compare with `=== "TRUE"`.
- **No framework**: All DOM manipulation is vanilla JS. No state management.
- **External CDNs**: Font Awesome 6.4.0, Google Fonts (Inter), marked.min.js for Markdown.
- **Cache-busting**: Append `?v=${Date.now()}` when fetching `runners.json` to avoid stale data.

### Tags Convention

`tags` is a comma-separated string. Use values from these categories — a runner can combine tags from multiple categories:

| Category | Values |
|---|---|
| Jenis Perkhidmatan | `Beli Makanan`, `Beli Barang`, `Hantar Barang`, `Parcels`, `Fotocopy / Print`, `Laundry`, `COD` |
| Had Perkhidmatan | `Perempuan Sahaja`, `Lelaki Sahaja` |
| Kawasan | `Dalam Kampus Sahaja`, `Dalam dan Luar Kampus` |
| Masa | `24 Jam`, `Waktu Siang`, `Waktu Malam`, `Hujung Minggu` |

Use `availability` for specific operating hour details (e.g. `Isnin - Jumaat: 9pagi - 9malam | Sabtu: 9pagi - 1petang`). Separate multiple schedules with ` | ` on a single line — newlines are not supported.

## GitHub Actions Sync

`.github/workflows/sync.yml` requires **Read and write permissions** enabled for Actions in repo settings (`Settings → Actions → General → Workflow permissions`).

GitHub's built-in cron (`*/5 * * * *`) is unreliable and can be delayed by hours. A **cron-job.org** job is configured to trigger `workflow_dispatch` every 5 minutes via the GitHub API as a reliable alternative. Both can run simultaneously without conflict — if data is unchanged, the workflow skips the commit (`git commit || exit 0`).

The sync fetches two CSVs:
- **Main sheet** — hardcoded URL in sync.yml, admin-managed
- **Form responses sheet** — hardcoded URL in sync.yml (`FORM_RESPONSES_CSV_URL` placeholder, replace once form is created)

## Runner Status Self-Update (PIN System)

Runners can toggle their own `isActive` status via a Google Form without admin access.

### How it works
1. Runner submits the Google Form with their Runner ID, PIN, and desired status (Online/Offline)
2. sync.yml fetches form responses, validates PIN against `pins.json`, and merges `isActive` into the output
3. Latest valid submission per runner wins; wrong PIN submissions are silently ignored
4. If a runner has never submitted the form, `isActive` falls back to whatever is set in the main sheet

### Google Form fields (exact labels)
| Label | Type | Options |
|---|---|---|
| `Runner ID` | Short answer | e.g. `RN-2024-001` |
| `PIN` | Short answer | 4-digit number |
| `Status` | Multiple choice | `Active` / `Not Active` |

### PIN management — `pins.json`
Stored in the repo root. Safe because the repo is **private**.

```json
{
  "RN-2024-001": "4521",
  "RN-2024-002": "8834"
}
```

To add a new runner: append their entry and commit. To change a PIN: update their value and commit. Share the PIN privately with the runner — never put it in the Google Sheet or any public file.
