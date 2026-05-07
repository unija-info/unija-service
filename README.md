# Unija Runner Directory

A searchable digital directory and profile card system for student delivery runners on campus. Built as a zero-cost static site — no server, no database, no build step.

## How It Works

```
Google Sheets (Admin Panel)
    ↓  published CSV, every 5 min
GitHub Actions (sync.yml)
    ↓  Python: CSV → JSON
runners.json  (auto-generated)
    ↓  fetch() in browser
index.html / profile.html
    ↓
GitHub Pages (live site)
```

- **Admins** manage runners by editing a Google Sheet.
- **GitHub Actions** syncs the sheet to `runners.json` every 5 minutes.
- **The site** reads that JSON at page load — no backend needed.

## Pages

| Page | Description |
|---|---|
| `index.html` | Searchable grid of all runners with live status dots |
| `profile.html?id=RN-001` | Individual runner profile: photo, tags, service receipt, WhatsApp link |

## Running Locally

Any static server works:

```bash
python -m http.server
# Open http://localhost:8000
```

> `file://` will not work — the browser blocks the `fetch()` call to `runners.json` due to CORS.

## Adding or Updating a Runner

Edit the Google Sheet directly. Changes appear on the live site within 5 minutes (next Actions run). Do **not** edit `runners.json` — it is overwritten on every sync.

### Required Sheet Headers (case-sensitive)

| Column | Example | Notes |
|---|---|---|
| `runnerId` | `RN-2024-001` | Unique ID, used in profile URL |
| `name` | `Ahmad Danish` | |
| `profilePic` | `https://...` | Publicly accessible image URL |
| `phone` | `601148387320` | WhatsApp number with country code |
| `description` | `Fast delivery...` | Short bio, searchable on grid |
| `isVerified` | `TRUE` | Shows checkmark badge on profile |
| `isActive` | `TRUE` | Controls green pulse dot |
| `duration` | `Full Sem` | |
| `validUntil` | `7 May 2026` | |
| `tags` | `Food, Parcels` | Comma-separated |
| `serviceDetails` | `## Price List...` | Markdown — rendered in receipt modal |

## GitHub Actions Setup

The sync workflow requires write access to the repo. In **Settings → Actions → General → Workflow permissions**, select **"Read and write permissions"**.

To trigger a manual sync: go to **Actions → Sync Google Sheet to JSON → Run workflow**.
