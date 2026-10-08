# Attendance summary — approved layout A

Implemented in `frontend/src/pages/AttendanceSummaryPage.jsx` and `attendanceSummary.css`. Preview fixture: `frontend/tests/fixtures/attendance-summary.html`, with illustrative values and no production API writes.

## Validation

- Production build succeeds; all 19 existing tests pass.
- Browser tests pass for class/student pagination, totals across pages, Vietnamese search without accents, class filtering, tuition sorting, empty classes, Escape and focus restoration, loading/empty/error.
- Stress fixture: 100 classes × 500 students. Only six class/student rows are rendered on wide screens; four in compact mode.
- Growth pagination checked on interior page 12 at 320, 375, 768 and 1024px. Pagers and row actions stay within their panels; no horizontal scroll or hidden panel scroll.
- Main screenshots checked at 1280, 375 and 1920px, plus all growth captures. Modal details are viewport captures, overview captures are full document captures.
- Impeccable detector returned `[]`. Independent finish reviewer disposition: **ship**, no material fixes. Documenter confirms existing brand/tokens are retained; no global design-system changes warranted.

## Wireframe comparison

| Block | Approved A | Implementation |
| --- | --- | --- |
| Totals | Classes, attended student-sessions, provisional tuition above filters | Match; totals calculated on all matching classes before pagination |
| Class overview | Compact table, per-class tuition, six desktop/four mobile rows | Match; compact mode extended through 1000px to prevent tablet clipping |
| Details | Right 560px panel, mobile full viewport, separate student pages | Match; native modal dialog adds focus isolation and a faint backdrop |
| Filters | Month, class, student search | Match; retains existing current-month action |
| App shell | Existing product context | Actual incumbent navy/gold sidebar retained |
| Repeated text | One line per class on desktop, concise mobile row | Match; names can wrap to preserve long names |

## Visual questions

1. Same-type rows have consistent layout; long names wrap rather than truncate. Missing optional student status does not add an empty line.
2. Row actions retain navy text, chevron and hover/focus treatment.
3. One divided metrics surface and one summary table; no nested card frames. Details use one elevated panel.
4. At 1920px the overview uses the available workspace width. Drawer whitespace intentionally reserves a stable height and keeps its pager anchored.
5. The numerical overview and class tuition carry the report hierarchy; student details remain secondary.

## Principle checks

N1: number columns use tabular numerals; details footer stays anchored. N2: empty, error and loading handled. N3: hierarchy limited to totals, class summary and opened details. N4: information has explicit text/numbers, not color alone. N5: existing sidebar, header, filters and tokens reused. N6: error and empty states provide recovery. N7: no student attendance or fee values are synthesized in the application. N8: names preserved; no clipped class actions or pagers at checked widths. N9: native dialog focus isolation, Escape, restored trigger focus and pointer controls verified. N10: existing API calculations retained; view state changes are necessary to make approved pagination/filtering functional. N11: no negative layout spacing; drawer shadow offset provides contextual depth. N12: three clear numerical summaries and concise class rows.

## Probe dispositions

Probe `probe/report.json` flags two stylistic hover findings, not geometry failures: P1 is the unchanged sidebar's class-menu hover background; P2 is the current-month button's hover matching the workspace background. Both retain their control borders/text and visible hit area. Existing focus rings are intentionally retained for keyboard use. Existing border tokens and sidebar scrollbar styling preserve product consistency. The fixture favicon 404 has no bearing on the report UI. Functional checks and independent review passed.

The live production API was not used for browser assertions; recorded screenshots use isolated illustrative fixtures. API data shape and fee calculation remain unchanged.
