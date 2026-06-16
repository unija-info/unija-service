# Unija Runner Directory

A searchable digital directory and profile card system for student delivery runners on campus. Zero-cost static site — no server, no database, no build step. Data is managed through Google Sheets and synced automatically every 5 minutes.

---

## System Architecture

```
[Admin]  Google Sheets (Main Sheet)  ─────────────────────────────────┐
[Runner] Google Forms → Form Responses Sheet                           │  published CSV
                                                                       ▼
[cron-job.org]  ──── POST /workflow_dispatch ──►  GitHub Actions (sync.yml)
                                                          │
                                                     Python script:
                                                     • fetch data.csv  (main sheet)
                                                     • fetch status.csv (form responses)
                                                     • validate PIN vs pins.json
                                                     • merge isActive into rows
                                                          │
                                                     runners.json  (committed to repo)
                                                          │
                                               ┌──────────┴──────────┐
                                          GitHub Pages            Vercel
                                               │
                                     fetch() in browser
                                     index.html / profile.html
                                               │
                                     External CDNs:
                                     • marked.js  (receipt Markdown rendering)
                                     • Font Awesome  (icons)
                                     • Google Fonts  (Inter typeface)
```

---

## Service Connections

| Service | Role | Impact if unavailable | Where to check |
|---|---|---|---|
| **Google Sheets** (main) | Admin CMS — source of all runner data | Runner data freezes at last sync | Sheets → File → Share → Publish to web |
| **Google Forms + Responses Sheet** | Runner self-service status toggle | Runners cannot change `isActive`; falls back to sheet value | Form → Responses tab → linked spreadsheet |
| **cron-job.org** | Reliable external trigger for sync every 5 min | Sync only runs on GitHub's native cron (can lag hours) | cron-job.org dashboard → job status |
| **GitHub Actions** | Runs `sync.yml` — fetches CSVs, converts, commits | `runners.json` never updates | GitHub → Actions tab → workflow run logs |
| **GitHub Pages / Vercel** | Hosts all static files | Site unreachable | GitHub Pages settings / Vercel dashboard |
| **marked.js CDN** | Renders `serviceDetails` Markdown in receipt modal | Receipt shows raw Markdown text (`##`, `**`) | Browser → DevTools → Network tab |
| **Font Awesome CDN** | Icons across both pages | Icons render as empty boxes | Browser → DevTools → Network tab |
| **Google Fonts** | Inter typeface | Falls back to system sans-serif — no functional breakage | Visual check only |

---

## Data Flow — Step by Step

1. **Admin edits Google Sheet** — adds or updates a runner row. Sheet is published to web as a CSV (not a share link — must use *File → Share → Publish to web*).

2. **cron-job.org fires every 5 minutes** — sends a POST request to the GitHub API to trigger `workflow_dispatch` on `sync.yml`. This is more reliable than GitHub's native cron scheduler, which can delay scheduled jobs by hours.

3. **GitHub Actions checks out the repo** and runs `sync.yml`.

4. **Two CSVs are fetched**:
   - `data.csv` — main Google Sheet (admin-managed runner records)
   - `current_status.csv` — Current Status tab (written by `form.gs` after PIN validation)

5. **Python script processes the data**:
   - Reads all rows from `data.csv` via `csv.DictReader`
   - Builds a `status_map` from `current_status.csv` (`runnerId` → `isActive`)
   - Merges `isActive` from `status_map` into the main rows (overrides the sheet value)
   - Writes `runners.json` with 2-space indent
   - Note: `sync.yml` performs **no PIN validation** — that is handled upstream by `form.gs`

6. **`runners.json` is committed** — only if content changed. If nothing changed, the commit is skipped silently (`git commit || exit 0`).

7. **Browser fetches `runners.json`** at page load via `fetch()`. `index.html` renders a card grid; `profile.html` reads `?id=` from the URL and hydrates the profile card.

---

## Pages

| Page | URL | Description |
|---|---|---|
| `index.html` | `/` | Searchable grid of all runners. Live search filters by name and description. Status dot shows `isActive`. |
| `profile.html` | `/profile?id=RN-2024-001` | Individual runner profile — photo, tags, availability, kawasan, service receipt modal, WhatsApp link. |

---

## Runner Status System (PIN)

Runners can toggle their own `isActive` status (Active / Not Active) without admin access.

**How it works:**

1. Runner submits the Google Form: enters their Runner ID, 4-digit PIN, and desired status
2. `onFormSubmit` fires in `script/form.gs` (Google Apps Script)
3. `form.gs` validates the PIN against the **`PIN` tab** in the Google Spreadsheet
4. If valid, `form.gs` writes `isActive` to the **`Current Status`** tab and logs to `History`
5. On next sync (up to 5 min), `sync.yml` fetches the `Current Status` tab and merges `isActive` into `runners.json`
6. If a runner has never submitted the form, `isActive` falls back to whatever the admin set in the main sheet

**PIN management — `PIN` tab in Google Sheets:**

PINs are stored in the `PIN` tab of the Google Spreadsheet (Column A = `runnerId`, Column B = PIN). To manage PINs, edit this tab directly — there is no `pins.json` file.

- To add a runner PIN: add a new row in the `PIN` tab
- To change a PIN: update the value in Column B
- Share PINs privately with runners — never put them in the main sheet or any public file
- **Gotcha**: Format Column A as **Plain text** (`Format → Number → Plain text`) to preserve leading zeros (e.g., `001` otherwise becomes `1`)

**Behaviour rules:**
- Wrong PIN → submission silently ignored, status unchanged
- No form submission ever → main sheet value is used as-is
- Latest valid submission per runner wins
- Form response rows are deleted immediately after `form.gs` reads them (keeps the sheet clean)

**To force a status back to the sheet value:** the runner's submission is already deleted after processing. Simply update `isActive` directly in the main sheet — it takes effect on the next sync where no overriding `Current Status` entry exists for that runner. To fully reset, also delete their row from the `Current Status` tab.

---

## Managing Runners

### Adding a new runner
1. Add a row to the Google Sheet with all required columns
2. Add their PIN to the `PIN` tab in the Google Spreadsheet (Column A = runnerId, Column B = PIN)
3. Share the PIN privately with the runner
4. Changes appear on the live site within ~5 minutes

### Updating runner info
Edit the Google Sheet directly. Do **not** edit `runners.json` — it is overwritten on every sync.

### Deactivating a runner
Set `isActive` to `FALSE` in the Google Sheet. If the runner has submitted a form with a valid PIN, the form value overrides the sheet. To ensure deactivation takes effect, also delete their row(s) from the Form Responses Sheet.

### Required Sheet Columns (headers are case-sensitive)

| Column | Example | Notes |
|---|---|---|
| `runnerId` | `RN-2024-001` | Unique ID, used in profile URL `?id=` |
| `name` | `Ahmad Danish` | Display name |
| `profilePic` | `https://...` | Publicly accessible image URL |
| `phone` | `601148387320` | Digits only, with country code — no dashes or spaces |
| `description` | `Fast delivery...` | Short bio; searchable on grid |
| `isVerified` | `TRUE` | Shows green "Verified Runner" badge |
| `isActive` | `TRUE` | Controls green pulse dot; overridden by form submission |
| `isUniParcels` | `TRUE` | Shows UniParcels badge on grid and profile |
| `duration` | `Full Sem` | Contract duration |
| `validUntil` | `7 May 2026` | Human-readable expiry |
| `tags` | `Beli Makanan, Parcels` | Comma-separated service tags |
| `serviceDetails` | `## Price List...` | Markdown — rendered in receipt modal |
| `availability` | `Isnin - Jumaat: 9pagi - 9malam \| Sabtu: 9pagi - 1petang` | Separate multiple schedules with ` \| ` — newlines not supported |
| `kawasan` | `Dalam dan Luar Kampus` | Coverage area — hidden on profile if empty |

---

## Local Development

Any static server works:

```bash
python -m http.server
# Open http://localhost:8000
```

> `file://` will not work — the browser blocks the `fetch()` call to `runners.json` due to CORS restrictions.

---

## GitHub Actions Setup

The sync workflow requires write access to commit `runners.json`.

**Settings → Actions → General → Workflow permissions → select "Read and write permissions"**

To trigger a manual sync: **Actions → Sync Google Sheet to JSON → Run workflow**

### cron-job.org Setup

GitHub's built-in cron (`*/5 * * * *`) is unreliable and can be delayed by hours. cron-job.org sends a reliable external trigger every 5 minutes.

Configure a job in cron-job.org to send this request every 5 minutes:

```
Method:   POST
URL:      https://api.github.com/repos/{owner}/{repo}/actions/workflows/sync.yml/dispatches
Headers:
  Authorization: Bearer {your-github-personal-access-token}
  Accept: application/vnd.github+json
Body:     {"ref":"main"}
```

A successful trigger returns **204 No Content**. The GitHub token needs `repo` and `workflow` scopes.

---

## Troubleshooting

### Sync / Data Not Updating

| Symptom | Likely Cause | Fix |
|---|---|---|
| Site shows no runners or blank grid | `runners.json` missing — workflow never ran | Actions tab → Run workflow manually |
| Sync runs but no new commit appears | Data unchanged since last sync | Normal behaviour — `git commit \|\| exit 0` skips empty commits |
| Workflow fails at the commit step | Missing write permissions | Settings → Actions → General → "Read and write permissions" |
| Sync only runs every few hours | GitHub native cron is unreliable | Verify cron-job.org job is active and returning 204 |
| cron-job.org returns 401 | GitHub Personal Access Token expired | Regenerate token with `repo` + `workflow` scopes; update in cron-job.org |
| cron-job.org returns 404 | Wrong repo name or workflow filename in the URL | Verify URL ends with `/workflows/sync.yml/dispatches` and matches the actual file |
| CSV fetch fails in workflow | Google Sheet is not published to web | Sheets → File → Share → Publish to web → confirm published |

### Frontend Load Failures

| Symptom | Likely Cause | Fix |
|---|---|---|
| "Failed to load" on index.html | CORS block from `file://` protocol | Open via HTTP server, not by double-clicking the file |
| Page loads but grid is empty | `runners.json` is empty or malformed | Trigger a manual sync; check workflow logs for Python errors |

### Runner Status Not Changing

| Symptom | Likely Cause | Fix |
|---|---|---|
| Runner submitted form but `isActive` didn't change | Wrong PIN entered | Verify the PIN in the `PIN` tab of the Google Spreadsheet matches what was shared with the runner |
| Runner ID not recognised despite correct PIN | ID stored as number in PIN tab | Format Column A of PIN tab as Plain text — Sheets converts `001` to `1` automatically |
| Correct PIN submitted but still not updating | Form field labels don't match expected names | Google Form fields must be exactly `Runner ID`, `PIN`, `Status` (case-sensitive) |
| `Status` field value not recognised | Runner selected a custom option or typed freetext | Status must be exactly `Active` or `Not Active` — use multiple choice, not short answer |
| `form.gs` not triggering at all | Trigger not set up as installable trigger | Apps Script editor → Triggers → add `onFormSubmit` as an installable trigger (not a simple trigger) |
| Admin set `isActive = FALSE` in sheet but runner appears active | Runner has a row in Current Status tab overriding the sheet | Delete the runner's row from the `Current Status` tab; re-sync |

### Profile Page Issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| "Runner Not Found" on profile page | `?id=` param doesn't match any `runnerId` | `?id=` matching is case-insensitive — verify the runner ID exists in `runners.json` |
| Green pulse dot not showing | `isActive` is `"FALSE"` or missing in `runners.json` | Check sheet value and any overriding form submission |
| Availability row missing | `availability` field is empty in the sheet | Add availability to the sheet; row only shows when field is non-empty |
| Kawasan row missing | `kawasan` field is empty in the sheet | Add kawasan to the sheet; row only shows when field is non-empty |
| Tags not showing | `tags` field is empty or missing | Add comma-separated tags to the sheet |

### WhatsApp Button

| Symptom | Likely Cause | Fix |
|---|---|---|
| WhatsApp link opens wrong number | Phone number has non-numeric characters | Store as digits only with country code: `601148387320` (no dashes, spaces, or `+`) |
| WhatsApp link doesn't open | Phone number is empty | Add phone number to the sheet |

### Receipt Modal (Service Charges)

| Symptom | Likely Cause | Fix |
|---|---|---|
| Modal shows raw Markdown (`##`, `**`) | marked.js CDN failed to load | Check browser DevTools → Network tab for CDN errors; may be blocked by ad blocker |
| Modal is blank | `serviceDetails` field is empty | Add Markdown content to `serviceDetails` in the sheet |
