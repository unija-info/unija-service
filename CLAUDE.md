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
| `tags` | string | Comma-separated, e.g. `Food, Parcels` |
| `serviceDetails` | string | Markdown; rendered in receipt modal |

### Page Behaviour

- **`index.html`**: Loads `runners.json`, renders a card grid, filters by name/description via live search. Card links go to `profile.html?id=[runnerId]`.
- **`profile.html`**: Reads `?id=` URL param, finds matching runner, hydrates the page. Renders `serviceDetails` as Markdown (marked.js CDN). WhatsApp button uses `wa.me/{phone}?text=...`. Green pulsing dot shown when `isActive === "TRUE"`.

## Key Patterns

- **String booleans**: `isVerified` and `isActive` are `"TRUE"/"FALSE"` strings (from Sheets CSV), not JS booleans — compare with `=== "TRUE"`.
- **No framework**: All DOM manipulation is vanilla JS. No state management.
- **External CDNs**: Font Awesome 6.4.0, Google Fonts (Inter), marked.min.js for Markdown.
- **Cache-busting**: Append `?v=${Date.now()}` when fetching `runners.json` to avoid stale data.

## GitHub Actions Sync

`.github/workflows/sync.yml` requires **Read and write permissions** enabled for Actions in repo settings (`Settings → Actions → General → Workflow permissions`). The Google Sheets CSV URL is hardcoded in the workflow file.
