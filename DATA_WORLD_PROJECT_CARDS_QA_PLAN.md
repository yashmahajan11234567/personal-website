# DATA_WORLD_PROJECT_CARDS_QA_PLAN.md
*Phase 1 — test plan for the project card redesign. Covers content accuracy, links, responsive, interaction, visual regression, and existing gameplay regression. **No implementation yet.***

---

## 1. Content Accuracy Checks

| Check | Method | Pass Criteria |
|---|---|---|
| **Project titles match content model** | Automated: `qa/accept-content-parity.mjs` reads `data-testid="project-title-link"` textContent vs `DATA_PROJECTS[n].title` | Exact match for all 4 projects |
| **GitHub URLs resolve to correct repo** | Automated: HEAD request to each `href` returns 200; URL contains expected repo path | All 4 links return 200; NIFTY URL includes subfolder `nifty100-financial-analysis(Bluestock-fintech)/` |
| **Description matches approved copy** | Manual diff: panel text vs `DATA_WORLD_PROJECT_CARDS_CONTENT.md` | Word-for-word match (whitespace normalized) |
| **Problem / Solution / Impact sections present with correct labels** | Automated: `h4` textContent includes "PROBLEM", "SOLUTION", "IMPACT" (uppercase) | All 3 labels present on each project |
| **Problem / Solution / Impact copy matches approved content** | Manual diff per project | Match approved copy |
| **Tech chips = verified technologies only** | Automated: chip textContent set equals `project.technologies` array (order irrelevant) | Set equality for all 4 |
| **No invented metrics / unverified claims** | Manual review: search for numbers not in `results[]` or `limitations[]` | Zero unverified numbers |
| **Limitations rendered verbatim from content model** | Automated: `li` count = `project.limitations.length`; text match | Exact match |
| **Dashboard gallery only on Data Analytics Dashboards** | Automated: `data-testid="dashboard-preview-*"` exists only for `data-analytics-dashboards` | True |
| **Dashboard previews use committed PNGs with `object-fit: contain`** | Automated: `img` src matches `project.dashboards[].previewPath`; computed style `object-fit: contain` | True for all 5 |
| **Dashboard selector shows 5 items with correct tool labels** | Automated: `data-testid="dashboard-select-*"` count = 5; each has tool badge | 5 selectors, labels: Excel, Tableau, Tableau, Tableau, Power BI |

---

## 2. Repository Link Checks

| Check | Method | Pass Criteria |
|---|---|---|
| **Title link opens repo in new tab** | Automated: click `data-testid="project-title-link"` → `window.open` called with `target="_blank"`, `rel="noreferrer noopener"` | True |
| **External link indicator visible on title** | Visual: `↗` or SVG present inside title anchor | Visible on all 4 |
| **No dead links** | Automated: HEAD all `github` + `demo` URLs | All 200/301 |
| **NIFTY URL points to subfolder** | URL contains `tree/main/nifty100-financial-analysis(Bluestock-fintech)/` | True (content-model fix) |

---

## 3. Responsive Checks

| Viewport | Tests |
|---|---|
| **1920×1080** (desktop) | Two-column overview grid; tech chips left, PROBLEM/SOLUTION/IMPACT right; panel max-width 560px; no horizontal scroll |
| **1440×900** (desktop) | Same as above; title fits; chips wrap if needed |
| **768×1024** (tablet portrait) | Two-column if width ≥ 768px; else stacked; panel fits |
| **390×844** (mobile) | Fully stacked; header Kind + BACK on separate lines; title wraps; chips `auto-fill minmax(96px, 1fr)`; overview rows full width; panel `calc(100% - 24px)`; max-height `85vh`; no clipping |
| **Reduced motion** | `@media (prefers-reduced-motion: reduce)` — panel open/close instant; no hover animations; transitions disabled |

**Automation:** Extend `qa/accept-responsive.mjs` to open each project panel at each viewport and assert layout via `page.evaluate()` DOM measurements.

---

## 4. Interaction Checks

| Interaction | Method | Pass Criteria |
|---|---|---|
| **Open panel from world** | Walk to hologram, press Enter / click | Panel opens, focus moves to panel, world locked |
| **Title click → new tab** | Click title link | `window.open` with correct URL, `target="_blank"` |
| **Tech chip hover/focus** | Mouse hover / Tab to chip | Scale + glow (desktop); focus ring visible (keyboard) |
| **Overview row hover** | Mouse hover | Left border widens, bg lightens |
| **Dashboard gallery selector** | Click selector buttons (Data Analytics Dashboards) | Preview swaps cross-fade; `aria-pressed` updates; keyboard operable |
| **Scroll long card** | Wheel / drag scrollbar | Body scrolls; header + BACK pinned; title never clipped |
| **Escape closes panel** | Press Escape | Panel closes with exit animation; focus restored to hologram; world unlocked |
| **BACK button closes panel** | Click BACK | Same as Escape |
| **Tab trap** | Tab through all focusables | Focus cycles within panel; never escapes to page behind |
| **Reduced motion: open/close instant** | `prefers-reduced-motion: reduce` | No fade/slide; panel appears/disappears immediately |

---

## 5. Visual Regression Checks

| Check | Tool | Baseline |
|---|---|---|
| **Desktop panel (1440×900) — all 4 projects** | Pixel diff vs approved design reference (supplied image) | New baseline captured in Phase 2 |
| **Mobile panel (390×844) — all 4 projects** | Pixel diff | New baseline |
| **Tablet panel (768×1024) — all 4 projects** | Pixel diff | New baseline |
| **Chip states (default, hover, focus)** | Visual snapshot | New baseline |
| **Overview row states (default, hover)** | Visual snapshot | New baseline |
| **Limitations section distinct styling** | Visual snapshot | Red left border, dark red bg |
| **Title external icon** | Visual snapshot | `↗` visible, purple accent |
| **Accent bar gradient (cyan → purple)** | Visual snapshot | `::before` gradient renders |
| **Heading font loads (JetBrains Mono)** | Visual snapshot + `document.fonts.check()` | Font applied to `h3`, `h4` |

**Automation:** New script `qa/accept-project-cards-visual.mjs` — captures panel screenshots at 3 viewports × 4 projects = 12 images, compares to committed baselines in `qa-screenshots-project-cards/` using pixelmatch (threshold 0.1%).

---

## 6. Existing Gameplay Regression Checks

| Suite | Command | Must Pass |
|---|---|---|
| **Layer 3 world (Core / Projects)** | `node qa/accept-dataworld-layer3.mjs` | 62/62 |
| **Layer 2 (Skills) + Layer 1 (Surface) traversal** | `node qa/accept-dataworld-traversal.mjs` | 5/5 |
| **Cards + Portal (skills cards, cliff portal)** | `node qa/accept-dataworld-cards-portal.mjs` | 72/72 |
| **Gameplay (movement, collision, camera)** | `node qa/accept-dataworld-gameplay.mjs` | 4/4 |
| **Exit (hero return)** | `node qa/accept-dataworld-exit.mjs` | 3/3 |
| **Skills stage-K visual** | `node qa/accept-dataworld-skills-stagek.mjs` | 63/63 |
| **Responsive (hero, cliff, skills, projects)** | `node qa/accept-responsive.mjs` | 13/13 |
| **Content parity (skills cards)** | `node qa/accept-content-parity.mjs` | All titles/links |
| **Full build + TypeScript** | `npm run build && npx tsc --noEmit` | Exit 0, no new errors |

**Run order:** Build → TypeScript → All QA suites → Visual regression.

---

## 7. Build & TypeScript Checks

| Check | Command | Pass Criteria |
|---|---|---|
| **Production build** | `npm run build` | Exit 0; `dist/` generated; no chunk warnings > 500 kB (existing only) |
| **TypeScript strict** | `npx tsc --noEmit` | Exit 0; zero errors |
| **ESLint (if configured)** | `npx eslint src/` | Exit 0; zero errors |
| **No new console errors in preview** | All QA suites | `page.errs.length === 0` in every suite |

---

## 8. Test Execution Plan (Phase 2)

### Pre-merge (local)
1. `npm run build` + `tsc --noEmit`
2. Start preview: `npx vite preview --port 4173 --host 127.0.0.1`
3. Run **all regression suites** (6–8 min parallel):
   - `qa/accept-dataworld-layer3.mjs`
   - `qa/accept-dataworld-traversal.mjs`
   - `qa/accept-dataworld-cards-portal.mjs`
   - `qa/accept-dataworld-gameplay.mjs`
   - `qa/accept-dataworld-exit.mjs`
   - `qa/accept-dataworld-skills-stagek.mjs`
   - `qa/accept-responsive.mjs`
   - `qa/accept-content-parity.mjs`
4. Run **new card-specific suites**:
   - `qa/accept-project-cards-content.mjs` (content accuracy + links)
   - `qa/accept-project-cards-responsive.mjs` (3 viewports × 4 projects)
   - `qa/accept-project-cards-interaction.mjs` (open, click, scroll, close, tab trap)
   - `qa/accept-project-cards-visual.mjs` (pixel diff vs baselines)
5. Verify all exit codes = 0.

### CI (GitHub Actions)
- Same matrix on `ubuntu-latest` + `node:20` + `playwright` deps.
- Artifact upload: `qa-screenshots-project-cards/`, `qa-screenshots-layer3/`, etc.
- Fail on any suite non-zero exit.

---

## 9. Acceptance Gate (Phase 2 Complete When)

- [ ] All 4 planning docs approved (this phase).
- [ ] Content model updated with `problem`/`solution`/`impact` fields.
- [ ] `ProjectCard.tsx` + `InfoPanel.tsx` + `InfoPanel.css` implemented per design plan.
- [ ] Heading font loads and applies.
- [ ] **All regression suites pass** (100%).
- [ ] **All new card suites pass** (100%).
- [ ] Visual baselines committed and matching.
- [ ] Zero console errors, zero TypeScript errors, build succeeds.
- [ ] Manual spot-check: open each project panel on desktop + mobile; verify copy, links, chips, overview rows, limitations, gallery.

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Two-column grid breaks on narrow desktop (~768px) | Medium | Layout shift | Test at 768px exactly; use `minmax(280px, 1fr)` for columns; stack at 720px if needed |
| Heading font fails to load / FOUC | Low | Typography fallback | `font-display: swap`; system monospace fallback stack |
| Panel height exceeds viewport on mobile | Medium | Content clipped | Max-height `85vh`; body scroll; header/footer pinned (already in CSS) |
| Dashboard gallery selector too tall on mobile | Low | Pushes limitations down | Collapse selector to dropdown on ≤ 420px (Phase 2 decision) |
| Content model `problem`/`solution`/`impact` fields drift from approved copy | Low | Inaccurate cards | Single source of truth: `projects.data.ts`; QA asserts exact match |

---

## 11. Deliverables for Phase 2 Handoff

1. Updated `src/content/types.ts` (diff).
2. Updated `src/content/projects.data.ts` (diff).
3. New `src/components/ProjectCard.tsx`.
4. Modified `src/components/InfoPanel.tsx` (diff).
5. Modified `src/components/InfoPanel.css` (diff).
6. `index.html` font link (diff).
7. New QA scripts: `accept-project-cards-content.mjs`, `accept-project-cards-responsive.mjs`, `accept-project-cards-interaction.mjs`, `accept-project-cards-visual.mjs`.
8. Visual baselines in `qa-screenshots-project-cards/`.
9. Test run logs (all green).