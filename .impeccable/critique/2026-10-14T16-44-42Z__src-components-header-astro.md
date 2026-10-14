---
target: Шапка, меню, состояние студии, шторка записи (TZ.md §4)
total_score: 28
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 2
target_identity: "file:C:\\Users\\G13\\Desktop\\CLAUDE\\Салон Красоты\\src\\components\\Header.astro"
target_fingerprint: "sha256:98fbf8dddbda6c11fd8b030cbd54d7de02f66d8e3d28f0235a05774e31999d54"
target_path: "C:\\Users\\G13\\Desktop\\CLAUDE\\Салон Красоты\\src\\components\\Header.astro"
timestamp: 2026-10-14T16-44-42Z
slug: src-components-header-astro
---
Method: dual-agent (A: design review · B: detector/evidence), both run as isolated subagents. No browser automation was available in this session, so Assessment A is a source-level review (HTML/CSS/TS reasoning, not live rendering) and Assessment B skipped browser-overlay evidence — both state this explicitly.

## Design Health Score (8 applicable / 10 — #7, #10 n/a for this Persuade-mode chrome)

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Hidden header stays focusable off-screen; no scroll cue on CTA reveal |
| 2 | Match System/Real World | 4 | — |
| 3 | User Control & Freedom | 3 | No "either studio" escape before CTA unlocks |
| 4 | Consistency & Standards | 4 | — |
| 5 | Error Prevention | 4 | try/catch around localStorage |
| 6 | Recognition vs Recall | 4 | Choice persisted, icons carry aria-label |
| 7 | Flexibility/Efficiency | n/a | Persuade-mode chrome, no power-user path |
| 8 | Aesthetic/Minimalist | 4 | — |
| 9 | Error Recovery | 2 | Dead `href="#"` links if JS fails, no messaging |
| 10 | Help/Documentation | n/a | — |
| **Total** | | **28/32 (87.5%)** | **Good** |

## Design Specificity Verdict

**LLM assessment:** Authored for The Garden specifically — `ButtonPrimary`'s arrow-in-circle hover reproduces DESIGN-SYSTEM.md §9 value-for-value (translate 2px/-2px, scale 1.05, 160ms); `MobileMenu` computes its clip-path origin from the actual tapped button's `getBoundingClientRect()` (a real aperture, not a stock drawer); `BookingSheet` carries the one spec-exact shadow value and is the only shadow anywhere in this layer, correctly honoring "теней в покое нет." Not category-interchangeable.

**Deterministic scan:** `impeccable detect --json` on all 8 target files → 0 findings. Mechanical checks (Assessment B): zero animated properties outside {transform, opacity, clip-path, background-color}; zero hex colors bypassing tokens (except Logo.astro's deliberate currentColor substitution); zero interactive elements missing an accessible name; both <dialog>s have aria-label + Escape(cancel) handling + backdrop-click handling. No false positives — code hygiene is clean; the real issues are interaction-logic/a11y-flow problems a static detector can't see.

**Visual overlays:** Not available — no browser automation tool exposed in this session.

## Overall Impression

Solid, spec-faithful chrome with clean code. The gaps are all in state transitions a static scan can't catch: a hidden header that's still tabbable, a CTA that pops into view with no scroll affordance, and dead links if JS fails to load.

## What's Working

1. ButtonPrimary is a literal, faithful build of the DS's signature button — not an approximation.
2. MobileMenu's per-tap-origin aperture reveal is a specific, product-grounded detail.
3. Shadow discipline: exactly one shadow value, exactly where the spec permits it.

## Priority Issues

- [P1] Hidden header remains keyboard-focusable off-screen. Header.astro only transforms translateY(-100%); header.ts never removes it from the tab order. Fix: add inert when data-hidden="true". → /impeccable harden
- [P1] Booking-sheet CTA reveal is an unsignaled layout jump. Selecting a studio unhides the CTA below with no scroll/focus move — on a short mobile viewport it can land off-screen. Fix: scroll the revealed block into view on selection. → /impeccable animate
- [P2] No focus handoff after anchor nav closes a dialog. Closing via link click doesn't move focus to the destination section. → /impeccable harden
- [P2] Dead CTA/messenger links if JS fails. They default to href="#" until booking-sheet.ts populates them. Fix: seed real fallback hrefs in markup. → /impeccable harden
- [P3] Mobile menu's 6 links share identical visual weight. "акции"/"цены" don't read as more important than "работы"/"лояльность". → /impeccable typeset

## Persona Red Flags

Casey (mobile): header fully hides past 120px scroll, and the hero's always-visible sticky CTA is a later build step — so mid-scroll right now there's briefly no booking entry point.
Jordan (first-timer): BookingSheet opens with no instructional copy ("выберите студию") — the two-step flow is discovered only by trial.
Sam (accessibility): the P1 focus bug is the clearest hit; also the studio-switch/picker use aria-pressed toggles rather than radiogroup/radio semantics for a mutually-exclusive choice.

## Minor Observations

showModal() default-focuses the close button, not the heading. Backdrop is fully transparent on both dialogs — consistent with the no-glass rule, but zero dimming cue.

## Questions to Consider

1. Is it acceptable that between this step and the hero step, mobile visitors scrolling past 120px temporarily have no path to "Записаться" — or should the sticky CTA move up to this step?
2. The booking sheet gates its CTA behind a forced studio choice with no "not sure" path — intentional friction, or worth an escape hatch?
