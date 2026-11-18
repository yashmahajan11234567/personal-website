# DATA_WORLD_PROJECT_CARDS_DESIGN_PLAN.md
*Phase 1 — component architecture, layout, styling, and interaction plan for the redesigned project cards. Based on audit of current `InfoPanel.tsx` / `InfoPanel.css` and the supplied design reference (dark cyberpunk, neon purple/cyan, two-column desktop / stacked mobile). **No implementation yet.***

---

## 1. Existing Component Architecture (Audit)

### InfoPanel.tsx (current)
- Single React component at `src/components/InfoPanel.tsx` handling **both** skills and projects via `kind` prop.
- Resolves content from `PORTFOLIO` model by `id` — never passed in directly.
- Renders `SkillPanel` or `ProjectPanel` fragments.
- **ProjectPanel** structure (current):
  1. Title (wrapped in `<a>` to `github` URL, `target="_blank"`, `data-testid="project-title-link"`) — **already matches brief requirement A**.
  2. Description paragraph (`info-panel__summary`).
  3. Facts `dl` — Authorship, Collaborators, "My contribution".
  4. DashboardGallery (only for Data Analytics Dashboards project) — large preview + selector strip.
  5. Technologies chips (`info-panel__tags` `ul>li`).
  6. Pipeline ordered list (`info-panel__pipeline`).
  7. Outcomes `ul` (from `results[]`).
  8. Limitations `ul` (required, always rendered).
  9. Evidence `ul` (from `evidence[]`).
  10. Demo link (optional).
- Panel is `role="dialog"`, `aria-modal="true"`, focus-trapped, `position: fixed` in viewport (not inside canvas), with pinned header (Kind + BACK button) and scrollable body (`auto 1fr auto` grid rows).
- Closing animation via `closing` prop; `onClose` callback.
- Keyboard: Escape closes, Tab trapped.

### InfoPanel.css (current)
- Dark surface `#07090f`, border `#2b3646`, cyan accent bar `::before` (gradient `#38b6d9` → `#8ceaff` → `#1d4a5c`).
- Width `min(560px, calc(100% - 32px))`, max-height `min(78vh, 640px)`.
- Body `overflow-y: auto`, custom scrollbar.
- Header `flex`, Kind label cyan uppercase, BACK button styled.
- Tags: `grid-template-columns: repeat(auto-fill, minmax(96px, 1fr))` (responsive chips).
- Mobile breakpoint `@media (max-width: 420px)` stacks header, `@media (max-width: 640px)` stacks tags.
- Pipeline `ol`, sections with `h4`, body text 15px / 1.55 line-height.
- Limitations section has distinct class `info-panel__section--limits` for emphasis.

### Gaps vs. Approved Design
| Requirement | Current | Gap |
|---|---|---|
| **Two-column lower section** (Skills left, Overview right) | Single vertical stack | Need desktop two-column grid |
| **PROBLEM / SOLUTION / IMPACT** as three visually distinct rows | Pipeline + Outcomes + Limitations (different labels) | Relabel + restructure |
| **Neon purple + cyan borders/accents** | Cyan only (`#38b6d9`/`#8ceaff`) | Add purple accent (`#a855f7`/`#c084fc`) |
| **Futuristic technical typography** | Inherits body font | Add heading font (e.g. `JetBrains Mono` or `Orbitron`) |
| **Card not modal** — inline in world? | Modal dialog over world | Brief implies card **in the panel** (same panel, new layout) — keep modal, redesign interior |
| **Scrollable card content** | Body scrolls | Keep, ensure no clipping |
| **External-link indicator on title** | `visually-hidden` text only | Add visible `↗` or icon |

---

## 2. Proposed Component / Data Structure

### Content Model — no changes required
Existing `Project` interface (`src/content/types.ts`) already has:
- `title`, `description`, `technologies[]`, `workflow.stages[]`, `results[]`, `limitations[]`, `github`, `evidence[]`, `dashboards?` — sufficient.

**New derived fields for cards** (computed in component, not stored):
- `problem` — from `workflow.stages[0].detail` + `description` synthesis, or new optional field on `Project` (Phase 2 decision).
- `solution` — from `workflow.stages` narrative.
- `impact` — from `results[]` + `limitations[]` synthesis.

> **Decision needed**: Add `problem`/`solution`/`impact` to `Project` type (source of truth) or derive in component? Recommendation: **add optional fields to `Project`** for explicit, reviewable copy — matches content-model philosophy ("every word read from model").

### Component Structure (new)

```
InfoPanel (unchanged shell: header, focus trap, scroll, close)
└─ ProjectCard (new fragment, replaces ProjectPanel)
   ├─ TitleRow (h3 + github link + external icon)
   ├─ Description
   ├─ TechChips (ul.info-panel__tags)
   └─ OverviewGrid (desktop: 2-col; mobile: stacked)
      ├─ SkillsColumn (left) — TechChips repeated? No — brief says Skills left, Overview right.
      │   Actually: brief §7: "two-column lower section, with Skills & Technologies on the left and Project Overview on the right"
      │   → Left: TechChips + maybe key metrics
      │   → Right: PROBLEM / SOLUTION / IMPACT rows
      └─ OverviewColumn (right)
         ├─ ProblemRow (h4 + p)
         ├─ SolutionRow (h4 + p)
         └─ ImpactRow (h4 + p)
   ├─ DashboardGallery (conditional, unchanged)
   ├─ Limitations (always rendered, distinct styling)
   └─ Evidence (optional, collapsible?)
```

> **Note**: The "Skills & Technologies" label in brief §7 refers to the **chips section**, not a separate skill list. So left column = tech chips; right column = Problem/Solution/Impact.

---

## 3. Layout Hierarchy (Desktop ≥ 768px)

```
┌─────────────────────────────────────────────────────────────┐
│ INFO-PANEL (fixed, 560px max, centered)                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ HEADER (pinned)  Kind: "Project"     [← BACK]           │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ BODY (scrollable)                                       │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ TITLE ROW  [NIFTY 100 Financial Analysis ↗]         │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ DESCRIPTION (2–3 sentences)                         │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ TECH CHIPS  [Python] [pandas] [SQLite] [FastAPI]…   │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │ ┌──────────────────┬──────────────────────────────────┐ │ │
│ │ │  SKILLS & TECH   │  PROJECT OVERVIEW                │ │ │
│ │ │  (left column)   │  (right column)                  │ │ │
│ │ │ ┌──────────────┐ │ ┌──────────────────────────────┐ │ │ │
│ │ │ │ [Chip] [Chip]│ │ │ PROBLEM                      │ │ │ │
│ │ │ │ [Chip] [Chip]│ │ │  Retail analysis needs…      │ │ │ │
│ │ │ └──────────────┘ │ └──────────────────────────────┘ │ │ │
│ │ │                │ │ ┌──────────────────────────────┐ │ │ │
│ │ │   (chips wrap) │ │ │ SOLUTION                     │ │ │ │
│ │ │                │ │ │  Six-stage warehouse…        │ │ │ │
│ │ │                │ │ └──────────────────────────────┘ │ │ │
│ │ │                │ │ ┌──────────────────────────────┐ │ │ │
│ │ │                │ │ │ IMPACT                       │ │ │ │
│ │ │                │ │ │  92 companies, 699/714 tests │ │ │ │
│ │ │                │ │ └──────────────────────────────┘ │ │ │
│ │ └──────────────────┴──────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ DASHBOARD GALLERY (Data Analytics Dashboards only)  │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ LIMITATIONS (always visible, distinct style)        │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Mobile / Tablet Layout (≤ 767px)

- Single stacked column (same order).
- Tech chips: `grid-template-columns: repeat(auto-fill, minmax(96px, 1fr))` (unchanged).
- Overview rows: PROBLEM / SOLUTION / IMPACT stacked, full width.
- Title wraps (`overflow-wrap: anywhere`).
- Panel width: `calc(100% - 24px)`, max-height `85vh`.
- BACK button remains in header (pinned).

---

## 5. Styling Approach

### Color Tokens (extend CSS custom properties)
```css
:root {
  --cyan-400: #38b6d9;
  --cyan-300: #8ceaff;
  --cyan-600: #1d4a5c;
  --purple-500: #a855f7;   /* NEW */
  --purple-400: #c084fc;   /* NEW */
  --purple-600: #7e22ce;   /* NEW */
  --bg-panel: #07090f;
  --border-subtle: #2b3646;
  --text-primary: #e8f4ff;
  --text-muted: #94a3b8;
  --font-heading: 'JetBrains Mono', 'Orbitron', monospace; /* NEW */
  --font-body: inherit;
}
```

### Visual Rules
- **Panel border**: `1px solid var(--border-subtle)` + `box-shadow` with cyan/purple glow layers.
- **Accent bar** (`::before`): cyan → purple gradient.
- **Title**: `font-family: var(--font-heading)`, `font-weight: 600`, `color: var(--cyan-300)`.
- **External link icon**: inline `↗` (or SVG) in `var(--purple-400)`, `margin-left: 4px`, `font-size: 0.8em`.
- **Section headers** (PROBLEM, SOLUTION, IMPACT, LIMITATIONS): `font-family: var(--font-heading)`, `text-transform: uppercase`, `letter-spacing: 0.08em`, `color: var(--purple-400)`, bottom border `1px solid var(--purple-600)`.
- **Tech chips**: `background: #0c111a`, `border: 1px solid var(--cyan-600)`, `color: var(--cyan-300)`, `padding: 4px 10px`, `border-radius: 4px`, `font-size: 12px`, `font-family: var(--font-heading)`. Hover: `border-color: var(--cyan-400)`, `box-shadow: 0 0 8px var(--cyan-600)`.
- **Overview rows**: `background: #0a0d14`, `border-left: 3px solid var(--purple-500)` (PROBLEM), `var(--cyan-400)` (SOLUTION), `var(--purple-400)` (IMPACT), `padding: 12px 16px`, `border-radius: 0 6px 6px 0`.
- **Limitations**: `border-left: 3px solid #ef4444` (red accent), `background: #1a0a0a` — distinct, unmissable.
- **Scrollbar**: unchanged (thin, dark).

### Typography Scale
| Element | Size / Line-height |
|---|---|
| Title | 20px / 1.3 |
| Description | 15px / 1.55 |
| Section header (PROBLEM, etc.) | 13px / 1.4, uppercase, tracking wide |
| Body copy (p) | 14px / 1.55 |
| Tech chips | 12px / 1.3 |
| Limitations | 14px / 1.55 |

---

## 6. Animation & Interaction Details

| Interaction | Spec |
|---|---|
| **Panel open** | Fade-in (150ms) + slide-up (200ms, `cubic-bezier(0.16, 1, 0.3, 1)`). Reduced-motion: instant. |
| **Panel close** | Fade-out (120ms) + slide-down. `closing` prop drives exit animation. |
| **Tech chip hover/focus** | Scale `1.02`, glow pulse (200ms). Focus ring: `2px solid var(--cyan-400)`, `offset: 2px`. |
| **Title link hover** | Icon `↗` translates `2px` right, color `var(--purple-300)`. |
| **Overview row hover** | Left border widens `3px → 6px`, background lightens 5%. |
| **Dashboard gallery** | Unchanged (cross-fade preview swap). |
| **Scroll** | Native, custom scrollbar (unchanged). |

---

## 7. GitHub Link Behaviour

- **Title** remains `<a href={github} target="_blank" rel="noreferrer noopener">` — **already implemented**.
- Add visible external-link indicator (`↗` or `<svg>`) inside the anchor, after title text.
- `aria-label` on anchor: `"{title} — opens the repository in a new tab"` (already via `visually-hidden` span; keep).
- No other external links in card (evidence links are internal to repo).

---

## 8. Accessibility Considerations

- **Focus management**: unchanged (panel `role="dialog"`, `aria-modal="true"`, Tab trap, restore on close).
- **Heading hierarchy**: `h3` title → `h4` for PROBLEM/SOLUTION/IMPACT/LIMITATIONS → correct.
- **Color contrast**: cyan/purple on `#07090f` ≥ 4.5:1 (verify in Phase 2).
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` disables all transitions/animations.
- **Keyboard**: Escape closes, Tab order logical (Title link → Tech chips → Overview rows → Gallery → Limitations → BACK).
- **Screen readers**: `visually-hidden` text on title link; section headers are real `h4`; chips are `ul>li` (list semantics).

---

## 9. Recommended Implementation Sequence (Phase 2)

1. **Extend `Project` type** (`src/content/types.ts`) — add optional `problem`, `solution`, `impact` string fields.
2. **Update content model** (`src/content/projects.data.ts`) — populate the three fields for all four projects using the approved copy from `DATA_WORLD_PROJECT_CARDS_CONTENT.md`.
3. **Create `ProjectCard.tsx`** — new fragment component (replaces `ProjectPanel` inline JSX), receiving `project` + `selectedDashboardId` + `onSelectDashboard`.
4. **Refactor `InfoPanel.tsx`** — render `ProjectCard` instead of inline `ProjectPanel` JSX.
5. **Extend `InfoPanel.css`** — add two-column grid, new tokens, chip/row styles, mobile stacking, accent bar gradient.
6. **Add heading font** — import `JetBrains Mono` (or `Orbitron`) via `@font-face` or Google Fonts `<link>` in `index.html`.
7. **Visual QA** — run `qa/accept-content-parity.mjs` (cards), `qa/accept-dataworld-layer3.mjs` (world), `qa/accept-responsive.mjs` (breakpoints), `npm run build`, `tsc --noEmit`.
8. **Screenshot capture** — desktop 1440×900, 1920×1080; mobile 390×844; tablet 768×1024.

---

## 10. Design Decisions Requiring Approval

| # | Decision | Options | Recommendation |
|---|---|---|---|
| 1 | Add `problem`/`solution`/`impact` to `Project` type vs. derive | A) Explicit fields (source of truth) B) Derive in component | **A** — matches content-model philosophy, reviewable |
| 2 | Heading font | `JetBrains Mono` (technical, monospace) vs `Orbitron` (futuristic display) | **JetBrains Mono** — readable at 13–15px, already in dev deps often |
| 3 | Tech chips in left column only, or also above overview? | Brief: "Skills & Technologies on the left, Project Overview on the right" → chips in left column only | **Left column only** (matches brief) |
| 4 | Limitations styling — red accent or keep current? | Current: distinct class only. Brief: "limitations block is set apart rather than styled down" | **Red left border + darker bg** — unmissable |
| 5 | Dashboard gallery placement | Current: after pipeline, before limitations. Brief doesn't specify. | **Keep current position** (after overview, before limitations) |
| 6 | Evidence section in card? | Current: rendered. Brief doesn't mention. | **Keep but collapse by default** (details/summary) to save height |

---

## 11. Responsive Breakpoints (from current CSS + brief)

| Breakpoint | Layout |
|---|---|
| ≥ 768px | Two-column overview grid (tech left, problem/solution/impact right) |
| 420–767px | Stacked; tech chips wrap; overview rows full width |
| ≤ 419px | Header stacks (Kind + BACK), panel full-width minus 24px |
| prefers-reduced-motion | All transitions/animations disabled |

---

## 12. Files to Modify (Phase 2 Scope)

| File | Change |
|---|---|
| `src/content/types.ts` | Add `problem?`, `solution?`, `impact?` to `Project` interface |
| `src/content/projects.data.ts` | Populate three fields for all four projects |
| `src/components/ProjectCard.tsx` | **New file** — card fragment |
| `src/components/InfoPanel.tsx` | Import & render `ProjectCard` |
| `src/components/InfoPanel.css` | Add tokens, two-column grid, chip/row styles, font import |
| `index.html` | Add Google Fonts link for `JetBrains Mono` (or `@font-face` in CSS) |

No changes to `WorldScene.ts`, `worldConfig.ts`, assets, or game logic.