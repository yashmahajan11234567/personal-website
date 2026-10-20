# Cloud World Cleanup Plan (REVISED PER REQUIREMENTS)

## 1. PROTECTED FILES - ABSOLUTELY NO MODIFICATIONS, DELETIONS, OR OVERWRITES
Per your requirements, these files and directories are completely off-limits for this cleanup:

- `/src/game/**` - Entire Phaser game engine (Data World ONLY)
- `/src/content/worlds.data.ts` - World configuration (MUST REMAIN INTACT - contains both data AND cloud world configs)
- `/src/content/types.ts` - Shared type definitions (MUST REMAIN INTACT)

## 2. FILES SAFE TO DELETE (Cloud World Specific - Verified No Protected Dependencies)

These files belong exclusively to the Cloud World implementation and can be safely deleted:

### Core Cloud World Implementation
- `/src/cloud-world/` - **Complete directory removal** (all Cloud World specific components, hooks, data, interactions)

### Cloud World Assets (Exclusively Used by Old Video-Frame Implementation)
- `/public/assets/ezgif-split/` - Extracted frame sequence (192 webp files)
- `/public/assets/ezgif-split-test/` - Test frame directory  
- `/public/assets/cloud-master.png`
- `/public/assets/cloud-master-transparent.png`
- `/public/assets/skills-valley.png`
- `/public/assets/projects-sunset.png`
- `/public/assets/ending.png`
- `/public/assets/cloud-poster.svg`
- `/public/assets/cloud-world-frames/`
- `/public/assets/clouds/`

### Cloud World Test Files
- `/tests/cloud-world.test.ts`
- `/qa/cloud-world.test.ts`
- `/qa/cloud-world-final.test.ts`
- `/qa/cloud-world-comprehensive.test.ts`
- `/qa/cloud-world-debug.test.ts`
- `/qa/cloud-world-fixed.test.ts`
- `/qa/cloud-world-interaction.test.ts`
- `/qa/cloud-world-redesign.spec.ts`
- All `/qa/debug-cloud*.mjs` files (26 total)
- `/qa/debug-frame-map.mjs`
- `/qa/debug-frames.mjs`
- `/qa/debug-init-timing.mjs`
- `/qa/debug-max-scroll.mjs`
- `/qa/debug-projects-frame.mjs`
- `/qa/debug-scroll.spec.ts`
- `/qa/debug-scroll2.spec.ts`
- `/qa/debug-scroll-timing.mjs`
- `/qa/debug-test.test.ts`
- `/qa/devtools-inspection.js`
- `/qa/devtools-launch.js`
- `/qa/final-check.mjs`
- `/qa/final-functional-test.mjs`
- `/qa/final-verification.test.ts`
- `/qa/final-verification-clean.test.ts`
- `/qa/final-verification-fixed.test.ts`
- `/qa/final-verify.mjs`
- `/qa/final-visual-verification.mjs`
- `/qa/legacy-check.js`
- `/qa/legacy-check.mjs`
- `/qa/manual-verification.js`
- `/qa/manual-verification.mjs`
- `/qa/run_cloud_spec.mjs`
- `/qa/skills-interaction.test.ts`
- `/qa/skills-interaction-final.test.ts`
- `/qa/skills-projects-interaction.spec.ts`
- `/qa/specific-legacy-check.mjs`
- `/qa/verify-cloud-world.spec.ts`
- `/qa/verify-rightward.mjs`
- `/qa/verify-v3.mjs`
- `/qa/verify-v4.mjs`
- `/qa/verify-v7.mjs`
- `/qa/visual-inspection.mjs`
- `/qa/visual-inspection2.mjs`
- `/qa/visual-inspection-v2.mjs`
- `/qa/cloud-world-1280-enhanced/` (complete directory)
- `/qa/ezgif-split/` (directory)
- `/qa/frame-analysis/` (directory)
- `/qa/phase1/` (directory)
- `/qa/phase2/` (directory)
- `/qa/screenshots/` (directory)
- `/qa/_legacy-2026-09-30/` (directory)
- `/qa/_scratch-e/` (directory)

### Cloud World Scripts and Tools
- `/capture-detailed.cjs`
- `/capture-exact-frames.mjs`
- `/capture-frames.cjs`
- `/capture-rxverify.mjs`
- `/capture-screenshots.mjs`
- `/capture-visual-qa.mjs`
- `/cdp-verify.cjs`
- `/cdp-verify.js`
- `/diagnose-cloud.mjs`
- `/inspect-cloud.mjs`
- `/inspect-cloud-better.js`
- `/inspect-cloud-dom.mjs`
- `/inspect-full.js`
- `/inspect-full.mjs`
- `/nul`
- `/run_full_test.sh`
- `/run_test_with_serve.sh`
- `/run_test_with_server.sh`
- `/run_tests.sh`
- `/test-browser.js`
- `/dev.log`

### Cloud World Documentation and Plans (Verify Sharing First)
- `/CLOUD_WORLD_FINAL_PLAN_CORRECTED.md`
- `/CLOUD_WORLD_FINAL_REPORT.md`
- `/CLOUD_WORLD_FINAL_SUMMARY.md`
- `/CLOUD_WORLD_IMPLEMENTATION_PLAN.md`
- `/CLOUD_WORLD_IMPLEMENTATION_SUMMARY.md`
- `/CLOUD_WORLD_REDESIGN_PLAN.md`
- `/FINAL_CLOUD_WORLD_REPORT.md`
- `/FINAL_QA_REVIEW_REPORT.md`
- `/FINAL_VERIFICATION_SUMMARY.md`
- `/IMPLEMENTATION_COMPLETION_SUMMARY.md`
- `/PHASE1_COMPLETION_PLAN.md`
- `/reference/` directory (to be verified for sharing)

### Cloud World Public HTML
- `/public/cloud-verify.html`

## 3. SHARED FILES REQUIRING INSPECTION (NO MODIFICATIONS YET)

These files contain Cloud World references but must be inspected before any potential future modifications:

### `/src/App.tsx`
- Cloud World import: `import { CinematicCloudWorldNew } from './cloud-world/CinematicCloudWorldNew';`
- Hash world mapping: `#/cloud-world': 'cloud-world'` 
- World selection logic: `path === 'data' ? 'data-world' : 'cloud-world'`
- Cloud World render case: `{currentWorld === 'cloud-world' && (<CinematicCloudWorldNew key="cloud-world" onExit={returnToHero} />)}`

### `/src/content/index.ts`
- Cloud World imports: `import { CLOUD_SKILLS } from './skills.cloud';` and `import { CLOUD_PROJECTS } from './projects.cloud';`
- Combined arrays: `const ALL_SKILLS: readonly Skill[] = [...DATA_SKILLS, ...CLOUD_SKILLS];` and `const ALL_PROJECTS: readonly Project[] = [...DATA_PROJECTS, ...CLOUD_PROJECTS];`

### `/src/store/gameStore.ts`
- World type: `export type World = 'hero' | 'data-world' | 'cloud-world' | 'experience';`
- Path type: `export type Path = 'data' | 'cloud';`

### `/src/content/worlds.data.ts`
**PROTECTED - DO NOT TOUCH** - Contains both world configurations, must remain intact for Data World

### `/src/game/config/worldConfig.ts`
**PROTECTED - DO NOT TOUCH** - Contains world palettes, must remain intact for Data World

## 4. ASSET CLASSIFICATION (QA/, reference/, reports, etc.)

### REQUIRED - PRESERVE COMPLETELY
- `/reference/` directory - **VERIFY SHARING** - May contain reference materials used by both worlds
- All report and plan files in root directory - **VERIFY INDIVIDUALLY** before deletion
- Any test infrastructure - **VERIFY** if used by Data World tests

### REUSABLE - POTENTIAL VALUE FOR NEW 3D IMPLEMENTATION
- `/public/assets/skills-valley.png` - Potential texture/reference for 3D valley environment
- `/public/assets/projects-sunset.png` - Potential texture/reference for 3D sunset environment  
- `/public/assets/ending.png` - Potential ending screen or transition asset
- `/public/assets/cloud-poster.svg` - Potential reference/vector art for 3D clouds
- `/public/assets/cloud-master.png` and `cloud-master-transparent.png` - Potential high-resolution cloud textures
- `/reference/authoritative-reference.mp4` - Visual reference for new 3D implementation (fly-through valley/mountain)
- `/reference/selection-transition.mp4` - Visual reference for new 3D implementation (selection/world transition)

### OBSOLETE - SAFE TO DELETE AFTER VERIFICATION
- `/public/assets/ezgif-split/` - Obsolete frame sequence (specific to old video-frame Cloud World)
- `/public/assets/ezgif-split-test/` - Obsolete test frames
- Individual frame files in `/left side/` and `/right side/` directories - Source frames with delay metadata
- ALL Cloud World specific test files listed in section 2
- ALL Cloud World specific scripts and tools listed in section 2
- ALL Cloud World specific documentation listed in section 2 (after verifying no sharing)

### UNCERTAIN - REQUIRES FURTHER INSPECTION
- `/reference/` directory - Need to confirm if used by Data World or shareable
- Root directory reports/plans (CLOUD_WORLD_*.md, FINAL_*.md, etc.) - Need individual verification
- Any remaining QA directories not explicitly listed - Need to verify contents

## 5. DEPENDENCY USAGE VERIFICATION (BEFORE PROPOSING REMOVAL)

### USED EXCLUSIVELY BY CLOUD WORLD (Safe to Remove After Cleanup)
- `gsap` - Used ONLY in `/src/cloud-world/hooks/useCinematicTimeline.ts` for ScrollTrigger animations
- `@fontsource/league-gothic` - Used ONLY for Cloud World UI (BoardLayer.css cloud board, CinematicHero.tsx heading under certain conditions)
- `@fontsource/archivo-black` - **VERIFY USAGE** - Used for Data World UI (BoardLayer.css data board) - MAY BE SHARED

### USED BY BOTH WORLDS OR DATA WORLD ONLY (KEEP)
- `phaser` - Used exclusively by Data World game engine (`/src/game/`)
- `react` and `react-dom` - Core framework used by both worlds
- `zustand` - State management used by both worlds (via gameStore)
- `@fontsource/archivo-narrow` - **VERIFY** - Check Data World usage
- `@fontsource/oswald` - **VERIFY** - Check Data World usage  
- `@fontsource/barlow-condensed` - **VERIFY** - Check Data World usage

### DEV DEPENDENCIES TO VERIFY
- `@playwright/test` and `playwright` - **VERIFY** - Check if Data World has tests
- `oxlint` - Linter (keep - used for both worlds)
- `typescript` - TypeScript (keep - used for both worlds)
- `vite` - Build tool (keep - used for both worlds)
- `@vitejs/plugin-react` - React plugin for Vite (keep - used for both worlds)
- `pngjs` - **VERIFY** - Check Data World usage

## 6. INTEGRATION APPROACH FOR NEW CLOUD WORLD (WITHOUT TOUCHING PROTECTED FILES)

### Routing Strategy (Preserves Protected Files)
1. Keep `/src/App.tsx` unchanged during cleanup phase
2. Add new 3D Cloud World implementation in `/src/cloud-world-3d/` directory
3. Update routing to point to new implementation when ready
4. Only after successful verification, remove old Cloud World references from protected files
5. This preserves Data World functionality throughout the transition

### Content Access Strategy (Preserves Protected Files)
1. New Cloud World imports from `/src/content/index.ts` (provides PORTFOLIO object)
2. Uses existing functions: `skillsForWorld('cloud')` and `projectsForWorld('cloud')`
3. These functions read from protected `worlds.data.ts` but do not modify it
4. Zero modifications needed to protected content files

### State Management Strategy (Preserves Protected Files)
1. New Cloud World manages its own local React state
2. OR uses separate standalone store just for 3D Cloud World
3. Coordinates with existing world selection through React props/context
4. Zero modifications needed to protected `gameStore.ts`

### Rendering Boundary Strategy (Preserves Protected Files)
1. New 3D Cloud World is a standalone React component
2. Mounted/unmounted similar to how existing WorldShell works
3. OR extend WorldShell to support 3D worlds without breaking existing Data World functionality
4. Zero modifications needed to protected `WorldShell.tsx` during cleanup

## 7. VERIFICATION STEPS (MUST PASS BEFORE PROCEEDING)

1. **Git Status Verification** - Confirm clean working directory or stash uncommitted work
2. **Dependency Usage Verification** - For each proposed dependency removal, confirm zero usage by Data World
3. **Data World Build Test** - Ensure `npm run build` completes successfully with Data World only
4. **Data World Dev Server Test** - Ensure `npm run dev` works and Data World functions correctly  
5. **Shared Asset Verification** - Before deleting any potential shared asset, confirm zero usage by Data World
6. **File Dependency Check** - For each file to delete, verify no imports from protected files

## 8. EXECUTION APPROACH (AFTER YOUR APPROVAL)

### Phase 1: Safe Deletions (Zero Risk)
- Delete all files in section 2 that have zero chance of sharing
- Verify Data World build/dev server after each major batch

### Phase 2: Verified Deletions (Low Risk)  
- Delete files after confirming no Data World usage through inspection
- Verify Data World functionality after each deletion batch

### Phase 3: Shared Asset Review (Careful)
- For `/reference/` directory and root reports/plans, inspect each file individually
- Preserve anything with potential Data World use or sharing value
- Delete only confirmed obsolete Cloud World-specific items

### Phase 4: Dependency Updates (Final)
- Remove verified Cloud World-only dependencies from package.json
- Re-run npm install to clean up node_modules
- Verify Data World still builds and runs

## 9. SUCCESS CRITERIA

✓ All Cloud World specific files deleted or prepared for deletion  
✓ Data World completely unaffected and fully functional  
✓ Zero modifications made to protected files during cleanup  
✓ Clear path forward for new 3D Cloud World implementation  
✓ All classifications verified through inspection, not assumption  

**READY FOR YOUR APPROVAL** - Once you approve this revised plan, I will begin execution with verification checkpoints at each stage.
