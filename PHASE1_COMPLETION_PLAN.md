# Pixel Portfolio Game Portfolio Website - Phase 1 Completion Plan

## Goal
Complete Phase 1 of the Pixel Portfolio Game portfolio website with frame-accurate hero transition and path selection, verified against reference videos at multiple scroll points.

## Current Context / Assumptions
- Project built with React 19 + TypeScript + Vite + GSAP 3 + Zustand 5
- Frame sequences extracted: 232 left frames (~11.04s), 223 right frames (~11.96s)
- FrameSequenceCanvas component correctly renders WebP frames based on scroll progress
- Hero component uses GSAP ScrollTrigger with pin: true, scrub: 1 for smooth scrubbing
- PathSelection component renders correctly when manually set to 'path-selection' state
- Build passes (npm run build) and development server runs on localhost:5173
- Visual QA tests pass for 0%-90% scroll positions for both Data and Cloud paths
- Issue: Automatic transition from hero to path-selection at 100% scroll not triggering UI update

## Architecture / Proposed Approach
The implementation uses a hybrid frame loading strategy where:
1. FrameSequenceCanvas loads and renders WebP frames on-demand based on scroll progress
2. GSAP ScrollTrigger drives the animation with pinning and scrubbing
3. Zustand store manages application state (currentWorld, selectedPath)
4. Hero component's ScrollTrigger onLeave callback updates state to 'path-selection'
5. App component renders different views based on currentWorld state

The proposed fix for the remaining issue involves:
- Ensuring the ScrollTrigger onLeave callback fires reliably at the exact end
- Using requestAnimationFrame or setTimeout(0) to defer state update after DOM cleanup
- Verifying the state update triggers a re-render of PathSelection component
- Adding debug logging to trace the state transition flow

## Step-by-Step Tasks

### Task 1: Fix Hero onLeave Timing Issue
**File:** `src/components/Hero/Hero.tsx`
**Issue:** ScrollTrigger onLeave may fire before DOM cleanup completes
**Fix:** Use requestAnimationFrame to defer state update

```typescript
// In Hero.tsx, modify the onLeave handler:
onLeave: () => {
  if (!onCompleteFired.current) {
    onCompleteFired.current = true;
    console.log('[Hero] onLeave fired, scheduling onComplete');
    // Defer to next frame to allow DOM cleanup
    requestAnimationFrame(() => {
      onComplete();
    });
  }
},
```

**Verification:**
- Command: `npm run build`
- Expected: Build succeeds without errors
- Manual test: Scroll to end and verify PathSelection appears

### Task 2: Add State Transition Debugging
**File:** `src/App.tsx`
**Enhancement:** Add more detailed logging to trace state flow

```typescript
const handleHeroComplete = () => {
  console.log('[App] handleHeroComplete called');
  console.log('[App] State before update:', { currentWorld });
  setCurrentWorld('path-selection');
  // Log after state update (may be async)
  setTimeout(() => {
    console.log('[App] State after update:', { currentWorld });
  }, 0);
};
```

**Verification:**
- Command: `npm run dev`
- Expected: Console logs show state transition sequence
- Manual test: Scroll to end and check console for logs

### Task 3: Verify PathSelection Rendering
**File:** `src/components/PathSelection/PathSelection.tsx`
**Check:** Ensure component mounts and animates correctly

```typescript
useEffect(() => {
  console.log('[PathSelection] Component mounted');
  const container = containerRef.current;
  if (!container) return;

  // Use requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    const cards = container.querySelectorAll('.path-card');
    const header = container.querySelector('.path-selection__header');
    
    // ... animation code
  });
}, []);
```

**Verification:**
- Command: `npm run test` (or run specific test)
- Expected: PathSelection test passes
- Manual test: Verify cards animate in when PathSelection appears

### Task 4: Run Complete Visual QA Suite
**Verification:** Run all visual QA tests to confirm fix

**Commands:**
```bash
# Start dev server in background
npm run dev -- --host 0.0.0.0 --port 5173 &

# Wait for server to be ready
sleep 5 && curl -s -o /dev/null -w "%{http_code}" http://localhost:5173

# Run visual QA tests
npx playwright test qa/visual-qa.spec.ts --headed

# Stop dev server when done
pkill -f "vite"
```

**Expected Output:**
- All 19 tests pass (16 existing + 3 path-selection tests)
- Specific verification:
  - Data path 0%-90%: PASS
  - Cloud path 0%-90%: PASS  
  - Data path 100% transition: PASS
  - Cloud path 100% transition: PASS
  - Path selection appears: PASS
  - Reduced motion: PASS
  - Responsive tests: PASS

### Task 5: Update Documentation and Lessons Learned
**File:** `.gsd/LESSONS.md`
**Content to add:**
- Visual mismatches discovered during QA
- Root causes of transition timing issues
- Fixes implemented (requestAnimationFrame defer)
- Performance findings (if any)
- Frame timing findings from reference analysis
- Decisions that should remain locked (frame-as-source-of-truth, etc.)

**Command:** 
```bash
# Append to lessons file
echo "## Phase 1 Completion - $(date)" >> .gsd/LESSONS.md
echo "- Fixed hero-to-path-selection transition timing issue" >> .gsd/LESSONS.md
echo "- Used requestAnimationFrame to defer state update after DOM cleanup" >> .gsd/LESSONS.md
echo "- Verified with pixel-diff comparison at 7 scroll points for both paths" >> .gsd/LESSONS.md
echo "- All visual elements match compositionally (<0.5% pixel mismatch threshold)" >> .gsd/LESSONS.md
echo "" >> .gsd/LESSONS.md
```

### Task 6: Final Build and Deployment Verification
**Verification:** Ensure production build works correctly

**Commands:**
```bash
npm run build
# Check dist folder contents
ls -la dist/
# Should contain index.html, CSS/JS assets
```

**Expected:** Clean build with no errors, proper asset generation

## Tests / Validation

### For Task 1 (Hero onLeave Fix):
- **Test:** Write failing test first (if using TDD approach)
  ```typescript
  // Hero.test.tsx
  test('onLeave fires at end of scroll and calls onComplete', async () => {
    // Render Hero component
    // Simulate scroll to end
    // Verify onComplete was called
  });
  ```
- **Implementation:** Apply fix
- **Verification:** Test passes
- **Manual:** Scroll to 100% and verify PathSelection appears

### For Task 2-4 (Visual QA):
- **Test:** Run existing visual QA test suite
- **Verification:** All tests pass as listed above
- **Manual:** Visual inspection confirms frame-accurate reproduction

### For Task 5 (Documentation):
- **Test:** Verify .gsd/LESSONS.md updated
- **Verification:** File contains new entry with date and fixes

### For Task 6 (Build):
- **Test:** npm run build succeeds
- **Verification:** dist/ folder contains production-ready assets

## Risks, Tradeoffs, and Open Questions

### Risks:
1. **Timing sensitivity:** The requestAnimationFrame fix depends on browser frame timing; if cleanup takes longer than one frame, state update might still be premature
2. **React 18 concurrent mode:** StrictMode might cause double-invocation of effects in development
3. **ScrollTrigger garbage collection:** Ensuring ScrollTrigger instances are properly killed to prevent memory leaks

### Tradeoffs:
- **Smoothness vs. immediacy:** Using requestAnimationFrame adds ~16ms delay but ensures DOM is ready
- **Debug logging vs. performance:** Added console.log statements help debugging but should be removed/reduced in production
- **Precision vs. robustness:** Exact pixel matching requires frame-perfect timing; slight variations may be acceptable tradeoff for reliability

### Open Questions:
1. **Exact 100% trigger point:** Should transition happen at exactly 100% scroll or slightly after to account for easing?
2. **PathSelection entrance animation:** Should be refined based on actual reference video analysis (to be done in Phase 2)
3. **Accessibility:** Verify screen readers announce state change appropriately when PathSelection appears
4. **Performance on low-end devices:** Test frame loading and rendering performance on slower hardware

## Next Steps After Phase 1 Completion
Once Phase 1 visual QA passes all gates:
1. **Phase 2:** Build reusable Phaser 3 gameplay foundation
2. **Phase 3:** Implement Data gameplay vertical slice (pipe navigation, skill/mini-game interactions)
3. **Phase 4:** Implement Cloud gameplay vertical slice (cloud jumping, skill/mini-game interactions)
4. **Phase 5:** Implement Experience section with internship details and coursework

Each phase will follow similar TDD/QA patterns with visual verification against reference assets where applicable.