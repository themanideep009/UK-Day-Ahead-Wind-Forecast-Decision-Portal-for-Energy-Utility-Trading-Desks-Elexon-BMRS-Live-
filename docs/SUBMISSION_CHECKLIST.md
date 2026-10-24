# Final Submission Checklist & Verification Protocol

*Ensure every item on this checklist is verified before final submission.*

---

## 1. Repository Anonymity & Hygiene
- [ ] **Repository Name**: Uses an anonymous random-string name (e.g. `gb-wind-desk-7a91fc`).
- [ ] **No Personal Identifiers**:
  - [ ] Checked `README.md` — no names, initials, GitHub handles, or personal emails.
  - [ ] Checked `package.json` and `pyproject.toml` — `author` field is omitted or neutral.
  - [ ] Checked git commit history (`git log`) — author name is `Anonymous Contributor` and email is `developer@anonymous.local`.
- [ ] **Clean Repository**:
  - [ ] `.venv/` and `node_modules/` are strictly ignored by `.gitignore`.
  - [ ] No `.DS_Store`, `Thumbs.db`, `.env` secrets, or editor configuration files committed.

---

## 2. README & Documentation Verification
- [ ] **Live Link**: Visible at the very top of `README.md`.
- [ ] **File / Directory Guide**: Complete breakdown of `backend/`, `frontend/`, `docs/`, and `scripts/`.
- [ ] **Quickstart Instructions**:
  - [ ] Docker one-liner: `docker compose up --build`.
  - [ ] Local manual startup: instructions for backend and frontend.
  - [ ] Test command: `pytest` and `npm test`.
  - [ ] Data refresh command: `python backend/ingest/run.py`.
- [ ] **Explicit AI Tool Disclosure Section**:
  - [ ] Clearly states which AI tools were used (e.g., Anthropic Claude / Google Antigravity).
  - [ ] States what they were used for (scaffolding, typing, boilerplate).
  - [ ] States that the developer independently reviewed, debugged, and verified all mathematical formulas, unit tests, and empirical data values.
- [ ] **Mandatory Elexon Attribution**:
  - [ ] Displayed in `README.md` and UI footer: *"Contains BMRS data © Elexon Limited copyright and database right 2026."*

---

## 3. Live Deployment (Vercel)
- [ ] **Project Name**: Matches anonymous convention without personal tags.
- [ ] **Deployment Protection**: Vercel "Deployment Protection" / password protection is **disabled** so the URL is publicly accessible without login walls.
- [ ] **Incognito Verification**:
  - [ ] Opens in Desktop Chrome Incognito mode without prompting for credentials.
  - [ ] Opens on a mobile phone / tablet with responsive layout.
- [ ] **API Functionality**:
  - [ ] `/api/health` returns status `ok`.
  - [ ] `/api/docs` opens Swagger UI documentation.
  - [ ] Decision Desk and Accuracy views load data instantaneously.
- [ ] **Smoke Test**: Passed `scripts/smoke_test.sh <LIVE_URL>` or `scripts/smoke_test.ps1 -BaseUrl <LIVE_URL>`.

---

## 4. Video Recording (YouTube)
- [ ] **Duration**: Under 10 minutes total (hard cap: 10:00, recommended: 9:00).
- [ ] **Structure**:
  - [ ] **Part 1 (Customer Pitch, ≤ 5 min)**:
    - [ ] The 09:20 EPEX gate closure problem.
    - [ ] Decision Desk live walkthrough with 09:20 vs 09:50 comparison.
    - [ ] Empirical P10 risk band and daily procurement buffer interpretation.
    - [ ] Forecast accuracy headline metrics (18.10% WAPE, +1,748 MW bias).
  - [ ] **Part 2 (Technical Walkthrough, ≤ 5 min)**:
    - [ ] Layered architecture and data flow.
    - [ ] As-of forecast selection code and no-lookahead unit tests.
    - [ ] Metrics hand-calculation unit tests.
    - [ ] Docker containerization and Vercel serverless configuration.
    - [ ] Spoken one-line AI usage disclosure.
- [ ] **YouTube Privacy**: Uploaded as **Unlisted** (not Private, not Public).
- [ ] **Audio & Incognito Playback**: Tested playing video in incognito window with clear sound.

---

## 5. Final Submission Form
- [ ] Public anonymous GitHub repository URL pasted into form.
- [ ] Production live deployment URL pasted into form.
- [ ] Unlisted YouTube video link pasted into form.
