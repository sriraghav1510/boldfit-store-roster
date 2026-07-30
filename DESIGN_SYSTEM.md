# Boldfit Roster Design System

## Source

This interface applies the supplied **Boldfit Visual Guide ©2025** to a workforce
product rather than recreating the catalogue layouts literally.

## Brand tokens

| Token | Value | Use |
|---|---:|---|
| Bold Black | `#000000` | Navigation, command surfaces, strong actions |
| Active White | `#FFFFFF` | Primary surface and reversed typography |
| Spark Yellow | `#FAEB31` | Active state, completion, finish line, creative spark |
| Operations Paper | `#F1F1EE` | Application background |
| Operations Charcoal | `#242529` | Secondary dark surface |

Semantic green, amber and red are reserved for operational status. They never
replace the black/white/yellow brand hierarchy.

## Typography

- Display headings use a condensed system fallback stack, oversized where space
  permits, with tight tracking.
- Italics communicate motion, journey and agility.
- Heavy bold communicates strength, result and discipline.
- A yellow dot or finish-line accent marks completion or creative spark.
- Interface copy uses Geist for legibility at small sizes.

The supplied guide describes the typographic behaviour but does not provide
redistributable font files. The app therefore uses local/system fallbacks and
does not download an unlicensed commercial font.

## Layout

- Editorial grids and fine divider lines organise dense operational data.
- Cards remain mostly rectangular with restrained radii.
- Black command surfaces anchor the page.
- Spark Yellow marks current steps, active tabs and primary workforce actions.
- Live status motion is subtle and respects `prefers-reduced-motion`.

## Role expression

- Employee: personal, guided, one action at a time.
- Store Manager: action inbox and store responsibility; no live dashboard.
- Area Ops: live command centre with cross-store comparison.
- HR Admin: payroll, people, identity, policy and audit controls.

## Accessibility

- Strong colour contrast on primary surfaces.
- Focus rings use Spark Yellow with a visible black/white edge context.
- Status meaning is always written in text, not communicated only by colour.
- Tap targets are at least 34–42 px in dense controls and larger for primary
  attendance actions.
- Tables remain horizontally scrollable on small screens.
- Animation is disabled when reduced motion is requested.
