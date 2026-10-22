# Password recovery — 2026-10-12

Ordinary extension of the existing ChessHub authentication UI. The login keeps its desktop navy showcase and mobile form layout; forgot/reset password use one centered form. Vietnamese labels, the navy/yellow Brand component, self-hosted typography, shared navy primary buttons and existing input styling remain in use.

The recovery surfaces reuse `--ui-soft`, `--ui-border`, `--ui-text`, `--ui-muted` and `--workspace-success`. Their flat white panel has a 12px radius; headings follow the documented 28px desktop / 24px mobile sizes. The shared password field adds an accessible 44px eye toggle, a visible focus treatment and 52px right input padding. The completed reviewer fixes use the shared muted color for recovery descriptions/placeholders and an inline SVG envelope.

Evidence: `agent/.impeccable/review/password-recovery/{login,forgot,reset}-{desktop,mobile}.png` contains all six reviewed views (1440px desktop, 390px mobile), including reset confirmation-error states. The finish reviewer returned ship for the limited verdict pass: contrast, envelope icon and password text clearance were resolved. This verdict was not a fresh full audit. Implementation validation reported a successful frontend build, 19 frontend tests, 107 backend tests across the latest reports, and mocked desktop/mobile flows; no real email was sent. The final backend regression covers an email change between lookup and acquiring the account lock, preventing delivery to the old address.

README.md and .env.example document reuse of Gmail OAuth, migration V19, 30-minute single-use links and the 60-second request cooldown.

No visual-system change is required. agent/DESIGN.md and the token source remain unchanged. Existing auth-specific styling still includes hard-coded colors, 13px labels, a 30px login heading and legacy error coloring; these incumbent differences were preserved rather than promoted into new system rules. Recovery-specific 32px desktop panel padding is a route composition choice. This summary does not replace the prior design documentation or open another audit.

