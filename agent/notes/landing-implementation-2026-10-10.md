# Landing page implementation · 10/10/2026

Implemented the walkthrough proposed in `landing-review-2026-10-10.md`.

- Kept the existing navy/gold identity and local Vietnamese fonts.
- Replaced the illustrative hero and feature cards with screenshots of the actual
  product components rendered using isolated synthetic fixtures.
- Added six manual steps: account, class, students, attendance, estimated tuition,
  and an optional Swiss tournament. Added previous/next, direct selection,
  arrow/Home/End navigation, mobile swipe on the explanation, and full-size images.
- Added teacher/center explanations, tuition/Swiss FAQ answers, and consistent CTAs.
- Updated registration copy to match estimated tuition and removed the unsupported
  setup-time/free-setup claim. Authentication logic is unchanged.
- On narrow screens, step navigation and screenshot content scroll independently;
  the image starts at the task area rather than the sidebar. Added a swipe hint,
  focusable image region and reduced-motion styles.

Screenshots: `frontend/public/images/landing/`. Reproduction instructions:
`frontend/tools/README.md`. The separate capture HTML/JSX entry is development-only
and is not part of the production bundle. It never uses a real account or backend.

Validation:

- Production build passed; 19 existing tests passed; `git diff --check` passed.
- All six steps show the correct text and loaded image.
- Home/End select and focus the first/last step; boundary controls are disabled.
- Register and login buttons navigate correctly. Tuition FAQ expands correctly.
- Desktop checked at 1280px and mobile at 390px; no horizontal document overflow.
- Mobile next-step control checked. Touch swipe is implemented but was not exercised
  on a physical touch device.

Preview evidence: `landing-preview-2026-10-10.png`, `landing-mobile-2026-10-10.png`.

Legal policy pages were not invented. The existing registration policy buttons
still need approved policy content and working destinations in a separate change.
