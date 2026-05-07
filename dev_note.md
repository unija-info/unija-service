This plan summarizes the current state of the **Student Runner Delivery Showcase** project. It outlines the architecture, data schema, and technical logic so that the next agent can continue development seamlessly.

---

# 📋 Project Plan: Student Runner Digital Showcase

## 1. Vision & Context
The goal is to provide a high-performance digital directory and personal business cards for student runners offering delivery services. 
*   **Target:** On-campus students (mobile-first).
*   **Key Feature:** A "Truth of Concept" digital card with a live status indicator and a service charge receipt overlay.
*   **Operational Goal:** Zero-cost hosting with a simple Google Sheets "Admin Panel."

## 2. Technical Architecture (SSG Model)
The system uses a **Static Site Generation (SSG)** flow for maximum loading speed:
1.  **Backend:** Google Sheets (User management/Status updates).
2.  **Automation:** GitHub Actions (`sync.yml`) runs every 5 minutes.
    *   Fetches the "Published to Web" CSV from Google Sheets.
    *   Converts CSV to a clean `runners.json` file.
    *   Pushes `runners.json` to the GitHub repository.
3.  **Frontend:** GitHub Pages hosting two main templates:
    *   `index.html`: A searchable grid directory.
    *   `profile.html`: The detailed digital business card.

## 3. Data Schema (Google Sheets)
The Google Sheet must contain the following headers in Row 1 (Case Sensitive):
*   `runnerId`: Unique ID (e.g., `RN-001`). Used in URL parameters.
*   `name`: Student's full name.
*   `profilePic`: URL to a hosted image.
*   `phone`: WhatsApp number (e.g., `6011...`).
*   `description`: Short bio or area of service.
*   `isVerified`: Boolean (`TRUE`/`FALSE`). Shows green checkmark.
*   `isActive`: Boolean (`TRUE`/`FALSE`). Controls the live green pulse.
*   `duration`: Enrollment status (e.g., "Full Sem").
*   `validUntil`: Expiry date of the runner's license.
*   `tags`: Comma-separated categories (e.g., `Food, Parcels`).
*   `serviceDetails`: Multiline text/Markdown for the price list.

## 4. Component Logic
### A. The Landing Page (`index.html`)
*   **Fetch:** Loads `runners.json`.
*   **UI:** Responsive grid with mini-cards showing name, ID, and a small status dot.
*   **Search:** Real-time filter by name or description.
*   **Navigation:** Links to `profile.html?id=[runnerId]`.

### B. The Profile Card (`profile.html`)
*   **Hydration:** Reads the `?id=` parameter from the URL to find the specific runner in `runners.json`.
*   **Live Status:** CSS animation (`pulse`) triggers if `isActive` is `TRUE`.
*   **Receipt Overlay:** A fixed-position, scrollable modal styled as a thermal receipt.
    *   **Markdown:** Uses `marked.js` with `breaks: true` to preserve line breaks from the Google Sheet.
*   **WhatsApp Path:** Dynamic link generation using `wa.me` with pre-filled messages.

## 5. Current Implementation Details
*   **Library:** `marked.min.js` (Markdown parsing).
*   **Styling:** Custom CSS with a "mobile-first" approach, using `fixed` overlays and `Inter` typography.
*   **Data Integrity:** The JS includes a "Key Cleaner" to trim accidental spaces in Google Sheet headers (e.g., `" isActive"` -> `"isActive"`).

---

## 🚀 Next Steps / Roadmap
1.  **Main Landing Page Refinement:** Enhance the grid with sorting (e.g., "Show Active First").
2.  **QR Code Integration:** Guidance on generating unique QR codes for each `profile.html?id=...` URL.
3.  **Error States:** Design a "Runner Not Found" or "Currently Unavailable" view for the profile page.
4.  **Security/Privacy:** Implement basic obfuscation for phone numbers if the client moves beyond a prototype.
5.  **Analytics:** Add a button-click tracker to see which runners are getting the most WhatsApp inquiries.

---

## 🛠 Required Repo Structure
```text
/ (root)
├── index.html            # Grid Directory
├── profile.html          # Dynamic Profile Template
├── runners.json          # Auto-generated database
└── .github/
    └── workflows/
        └── sync.yml      # The Python-based sync engine
```

**Developer Note:** Ensure **Workflow Permissions** in GitHub Settings are set to **"Read and write permissions"** for the auto-sync to work.