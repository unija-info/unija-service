# DEV_NOTES.md

> Note to next Claude window: read this fully before touching anything. This isn't just a status update — it's a briefing.

---

## The Vibe of This Conversation

The user is building a real, live system for their university community — not a toy project. They're hands-on but lean on Claude to navigate and audit the codebase. Questions were short and direct (sometimes a single sentence), and they trusted the answers. Tone was casual, practical, mix of English and Malay. They don't need explanation of basics — just cut to what matters.

The big theme of this session was **auditing what was real vs. what was planned**. A lot of documentation in this repo described a *future architecture* that was never built. We spent time figuring out what actually runs vs. what was aspirational writing from a previous agent or planning session.

---

## Critical Discoveries This Session

### 1. The PIN system is NOT in the repo — it's in Google Sheets
The old CLAUDE.md, README.md, and dev_note.md all described a `pins.json` file in the repo root that `sync.yml` reads for PIN validation. **This was never implemented.**

The actual PIN system:
- PINs live in a **`PIN` tab** in the Google Spreadsheet (Column A = runnerId, Column B = PIN)
- Validation happens in **`script/form.gs`** (Google Apps Script), triggered by `onFormSubmit`
- `form.gs` validates the PIN, then writes the result to the **`Current Status`** sheet tab
- `sync.yml` reads `Current Status` as a CSV — it does **zero PIN validation**

If the next agent sees references to `pins.json`, those are from old/stale documentation. Ignore them.

### 2. `sync.yml` is simpler than documented
It just:
1. Fetches `data.csv` (main sheet)
2. Fetches `current_status.csv` (Current Status tab)
3. Merges `isActive` from current_status into the main rows
4. Writes `runners.json` and commits

No PIN logic. No form response processing. No `pins.json`.

### 3. profile.html had case-sensitive `?id=` matching — we fixed it
The original code was:
```js
data.find(r => r.runnerId === id)
```
We changed it to:
```js
data.find(r => r.runnerId.toLowerCase() === id.toLowerCase())
```
Now `?id=r001` and `?id=R001` both work. This is committed in `profile.html:148`.

### 4. Google Sheets auto-converts IDs like `001` to the number `1`
User reported their runner ID `001` wasn't being recognized. Root cause: Google Sheets treats it as a number, so the PIN tab reads `"1"` not `"001"`. Fix: format Column A of the PIN tab as **Plain text** (`Format → Number → Plain text`) before entering IDs.

### 5. Old dev_note.md was a previous agent's planning doc
It described schema that's now outdated (missing `isUniParcels`, `kawasan`, `kriteriaP`, `registeredOn`, `isTest`). Replaced with this file.

---

## What We Actually Did This Session

- Explained the system benefits to the user (in Malay)
- Created `benefits.md` (Malay) in the project root
- Clarified `availability` field formatting (` | ` separator)
- Audited the PIN system — found the discrepancy between docs and reality
- Read `script/form.gs` to confirm actual PIN logic
- Read `sync.yml` to confirm it does no PIN validation
- Fixed case-insensitive `?id=` matching in `profile.html`
- Rewrote `CLAUDE.md` to match actual implementation
- Updated `dev_note.md` (this file) and `README.md`

---

## Files That Were Updated This Session

| File | What changed |
|---|---|
| `profile.html` | Case-insensitive `?id=` matching (line 148) |
| `CLAUDE.md` | Full rewrite — corrected PIN system, added missing files/fields |
| `README.md` | Fixed Data Flow and PIN system sections (was describing pins.json/sync.yml flow) |
| `dev_note.md` | Replaced old planning doc with this file |
| `benefits.md` | Created new — Malay language benefits list for runners |

---

## Current State of the Codebase

Everything is working. The live site is on Vercel. Status updates flow:
```
Runner submits Google Form
    → form.gs validates PIN (Google Sheets PIN tab)
    → writes to Current Status tab
    → sync.yml picks it up within 5 minutes
    → runners.json updated on repo
    → site reflects new status
```

The `script/form.gs` requires an **installable `onFormSubmit` trigger** — if it's ever not working, check that trigger is set up manually in the Apps Script editor.

---

## User Profile

- Building for a real university community (UNIJA)
- Malay-speaking; code/technical terms in English, explanations can be in either
- Asks short, direct questions — doesn't need hand-holding
- Trusts Claude to dig into the code and report back accurately
- Cares about correctness over completeness — they'd rather know "this doesn't exist yet" than get a wrong answer

---

## What's Left / Potential Next Steps

From the old roadmap (still valid ideas):
- Sort active runners to the top of the index grid
- "Runner Not Found" error state on profile page
- QR code generation per runner profile URL

Nothing is broken. Nothing is urgent. The system is live and functional.
