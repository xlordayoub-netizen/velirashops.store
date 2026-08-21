# Project: WEB site ecom

## Design system policy (MANDATORY)

Two design skill sets are installed in `.claude/skills/` and MUST be applied automatically to **every** UI/UX or frontend task — designing pages, building or refactoring components, choosing colors/typography/spacing/layout, animation, accessibility, or reviewing UI — unless the user explicitly says not to.

### 1. UI/UX Pro Max (`.claude/skills/ui-ux-pro-max/` + companions)

From https://github.com/nextlevelbuilder/ui-ux-pro-max-skill. Installed skills:

- `ui-ux-pro-max` — main design-intelligence skill: 84 styles, 192 color palettes, 74 font pairings, 98 UX guidelines, priority-based rule categories (accessibility first). **Read its `SKILL.md` before any UI work** and follow its priority table (1 Accessibility → 10 Charts).
- `design`, `design-system`, `ui-styling`, `brand`, `banner-design`, `slides` — companion skills; use when the task matches their scope.

The skill's `scripts/search.py` requires Python, which is **not currently installed** on this machine. Until it is, do NOT try to run the script — instead read/grep the skill's data directly:
- `.claude/skills/ui-ux-pro-max/references/quick-reference.md` — full rule text for all UX guideline categories
- `.claude/skills/ui-ux-pro-max/references/pro-rules.md` — polish rules + pre-delivery checklist
- `.claude/skills/ui-ux-pro-max/data/*.csv` — styles, palettes, font pairings, product types (searchable with Grep)

### 2. Anthropic frontend-design (`.claude/skills/frontend-design/`)

From https://github.com/anthropics/skills/tree/main/skills/frontend-design. Read its `SKILL.md` before building new UI: make deliberate, non-templated aesthetic choices (palette, typography, layout, one signature element), plan tokens first, critique against generic defaults before coding.

### How to combine them

- frontend-design governs **aesthetic direction** (distinctive, intentional, non-generic).
- ui-ux-pro-max governs **UX correctness** (accessibility, touch targets, responsive layout, forms, navigation, performance).
- On conflict, UX correctness rules (accessibility, contrast, touch sizes) win over aesthetics.

### Baseline rules to always enforce

- Contrast ≥ 4.5:1, visible focus states, alt text, keyboard navigation, aria-labels
- Touch targets ≥ 44×44px with ≥ 8px spacing
- Mobile-first responsive layout, no horizontal scroll, don't disable zoom
- Base font 16px, line-height ~1.5, semantic color tokens (no raw hex scattered in components)
- SVG icons, never emoji as icons
- Animations 150–300ms, respect `prefers-reduced-motion`
- Visible form labels (not placeholder-only), errors next to fields
- WebP/AVIF images, lazy loading, reserve space to keep CLS < 0.1
