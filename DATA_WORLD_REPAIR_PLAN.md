# DATA_WORLD_REPAIR_PLAN.md

## Implementation Plan

**Objective**: Restore visible entry plate overlay so user can dismiss it and play the Data World game.

**Scope**: Single CSS fix — no source logic changes, no asset changes, no build config changes.

---

### Change 1: Remove z-index from .placeholder-world (Mandatory)

**File**: `src/App.css`
**Lines**: ~36-45 (`.placeholder-world` rule)

**Current Code**:
```css
.placeholder-world {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-mono);
  overflow: hidden;
  z-index: 100;  /* ← REMOVE THIS LINE */
}
```

**Proposed Code**:
```css
.placeholder-world {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-mono);
  overflow: hidden;
  /* z-index removed — entry plate must render above canvas */
}
```

**Why**: The `z-index: 100` on a `position: fixed` element creates a stacking context that renders the entire game canvas (and its black background) **above** the sibling `.world-entry` plate (which has `z-index: 40` in the root stacking context).

**Regression Risk**: **Low**. The exit button (`world-exit`) is a child of `.placeholder-world` and will remain clickable. The entry plate will be given explicit z-index in Change 2.

**Verification**:
```bash
# After rebuild:
cd /Users/yashsiphone/personal-website-river
npm run build
# Restart preview server
# Playwright test:
# 1. Load #/data-world
# 2. Verify entry plate visible (opacity=1, z-index > canvas)
# 3. Click "Enter the world" button
# 4. Verify plate hidden, game canvas interactive
# 5. Run full navigation cycle (30/30)
```

---

### Change 2: Add explicit z-index to .world-entry (Mandatory)

**File**: `src/components/WorldShell.css`
**Location**: Add to `.world-entry` rule (search for `world-entry`)

**Current Code** (in `src/components/WorldShell.css`):
```css
.world-entry {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  background: rgba(4, 6, 10, 0.95);
  pointer-events: auto;
  /* ... rest of rule ... */
}
```

**Proposed Code**:
```css
.world-entry {
  position: absolute;
  inset: 0;
  z-index: 50;  /* ← CHANGE FROM 40 TO 50 */
  display: grid;
  place-items: center;
  background: rgba(4, 6, 10, 0.95);
  pointer-events: auto;
  /* ... rest of rule ... */
}
```

**Why**: With `.placeholder-world` no longer creating a stacking context (z-index removed), both `.placeholder-world` and `.world-entry` will be in the root stacking context. The entry plate needs `z-index: 50` to render above the canvas (which has `z-index: auto` / 0) but below any future true modals.

**Regression Risk**: **None**. This restores the intended layering: entry plate > game canvas > page content.

**Verification**: Same as Change 1 — entry plate visible and dismissable.

---

### Change 3: Rebuild and Verify (Process)

**Commands**:
```bash
cd /Users/yashsiphone/personal-website-river

# 1. Clean build
rm -rf dist
npm run build

# 2. Restart preview server (IPv6 for Playwright compatibility)
npx vite preview --port 4173 --host ::

# 3. Run automated verification
node qa/accept-dataworld-gameplay.mjs
node qa/accept-dataworld-exit.mjs
node qa/accept-dataworld-traversal.mjs
node qa/accept-responsive.mjs

# 4. Run Playwright navigation verification
cd /Users/yashsiphone/.hermes/cache/scratch
node dw-verify.mjs --viewport=1440x900 --full
node dw-verify.mjs --viewport=390x844 --full

# 5. Manual browser check
# Open http://localhost:4173/#/data-world
# Hard refresh (Cmd+Shift+R)
# Verify entry plate visible, click "Enter the world"
# Verify game plays, pipes work, camera correct
```

---

### Regression Test Matrix

| Test | Before Fix | After Fix (Expected) |
|------|------------|----------------------|
| Entry plate visible on load | ❌ Hidden behind canvas | ✅ Visible, clickable |
| "Enter the world" button works | ❌ Unclickable (under canvas) | ✅ Dismisses plate |
| Exit button clickable | ✅ Works | ✅ Still works |
| Game renders after entry | ❌ Black screen | ✅ Full game visible |
| Camera at 90% ground | ✅ Works | ✅ Works |
| Pipe navigation (6 transitions) | ✅ Works | ✅ Works |
| All viewports (1440, 1280, 768, 390) | ✅ Works | ✅ Works |
| No console errors | ✅ Clean | ✅ Clean |

---

### Optional: Cache Busting Note

**Issue**: Users with stale browser cache may load old bundle `engine-D9IGmRNv.js` which contains robot animation code and throws errors.

**Mitigation**: 
- Vite includes content hashes in bundle filenames (`engine-kHxTe7De.js` vs old `engine-D9IGmRNv.js`)
- HTML references new bundle — cache should auto-invalidate
- If user reports robot errors: instruct **hard refresh** (`Cmd+Shift+R` / `Ctrl+Shift+R`)

**No code change required** — this is a client-side cache issue, not a build defect.

---

### Implementation Order

1. **Apply Change 1** (remove z-index from `.placeholder-world`)
2. **Apply Change 2** (set `.world-entry` z-index: 50)
3. **Run Change 3** (rebuild, restart server, verify)
4. **Confirm all acceptance criteria pass**

**Estimated Time**: 5 minutes (2 edits + build + verification)

---

### Rollback Plan

If any regression occurs:
```bash
cd /Users/yashsiphone/personal-website-river
git checkout src/App.css src/components/WorldShell.css
npm run build
```
This restores the exact state before this repair (commit `563a1fd`).

---

### Approval Gate

**Do not implement until user reviews and approves this plan.**

The plan contains:
- ✅ Exact file and line locations
- ✅ Current vs proposed code diffs
- ✅ Root cause justification
- ✅ Regression risk assessment
- ✅ Verification steps with commands
- ✅ Rollback procedure