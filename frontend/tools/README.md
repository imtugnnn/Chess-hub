# Landing screenshots

The six PNG assets in `public/images/landing/` are screenshots of existing product
components with synthetic fixtures. No backend account or data is used.

Run Vite, then open `/landing-capture.html?step=register`. Supported steps:
`register`, `create`, `students`, `attendance`, `tuition`, `swiss`.

For the create screenshot, enter `Cờ vua căn bản`, `100000`, select sample dates
and fill the corresponding time fields with `17:30`–`19:00`. Do not submit.
Capture the full page for each step. Use October 2026 for the report month to
match the fixtures. Keep passwords blank and do not use real personal data.

`landing-capture.html` is a separate development entry; the production build
only builds `index.html`. The fixture fetch handler rejects mutations. The
landing page serves static PNGs and never imports the capture entry.

Current assets were captured on 2026-10-10. Total size is approximately 480 KiB;
the screenshots preserve text sharply. Refresh screenshots when product UI changes.

## Review output conventions

Run review scripts from `frontend/`. Store screenshots and machine-readable
review evidence in `../agent/.impeccable/review/<surface>/`, and written design reports
in `../agent/.impeccable/reports/`. Do not write review output into `docs/`.
`center-review.cjs` creates `../agent/.impeccable/review/center/` automatically.
The historical reports and screenshots are under `../agent/.impeccable/reports/`.

Most browser scripts currently load Playwright from a local Codex runtime and
launch Microsoft Edge. Some accept `PLAYWRIGHT_MODULE`; check the script before
running it on another machine. The scripts are maintained development tools,
not part of the production bundle.
