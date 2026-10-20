# Cloud World Cleanup Plan

## 1. Files and Directories to Delete (Cloud World Specific)

These files and directories belong exclusively to the current Cloud World implementation and can be safely deleted:

### Core Cloud World Implementation
- `/src/cloud-world/` - Entire directory (all Cloud World specific components, hooks, data, interactions)
- `/src/content/skills.cloud.ts` - Cloud world skill definitions
- `/src/content/projects.cloud.ts` - Cloud world project definitions
- `/src/content/worlds.data.ts` - World configuration (contains cloud world config, but must preserve data world config - see shared files section)
- `/src/game/config/worldConfig.ts` - World configuration (contains cloud world palette, but must preserve data world config - see shared files section)

### Cloud World Assets (in public directory)
- `/public/assets/ezgif-split/` - Extracted frame sequence (192 webp files)
- `/public/assets/cloud-master.png` - Cloud master image
- `/public/assets/cloud-master-transparent.png` - Transparent cloud master
- `/public/assets/skills-valley.png` - Skills valley reference
- `/public/assets/projects-sunset.png` - Projects sunset reference
- `/public/assets/ending.png` - Ending image
- `/public/assets/cloud-poster.svg` - Cloud poster SVG
- `/public/assets/cloud-world-frames/` - Directory with cloud world frames
- `/public/assets/clouds/` - Directory with cloud assets
- `/public/assets/dashboards/` - Dashboard images (shared with data world - see shared files)

### Cloud World Test Files
- `/tests/cloud-world.test.ts` - Cloud world Playwright tests
- `/qa/cloud-world.test.ts` - Cloud world QA tests
- `/qa/cloud-world-final.test.ts` - Cloud world final QA tests
- `/qa/cloud-world-comprehensive.test.ts` - Comprehensive cloud world tests
- `/qa/cloud-world-debug.test.ts` - Debug cloud world tests
- `/qa/cloud-world-fixed.test.ts` - Fixed cloud world tests
- `/qa/cloud-world-interaction.test.ts` - Interaction cloud world tests
- `/qa/cloud-world-redesign.spec.ts` - Redesign cloud world spec
- `/qa/debug-cloud*.mjs` - All debug cloud scripts (26 files)
- `/qa/debug-frame-map.mjs` - Frame map debug
- `/qa/debug-frames.mjs` - Frames debug
- `/qa/debug-init-timing.mjs` - Init timing debug
- `/qa/debug-max-scroll.mjs` - Max scroll debug
- `/qa/debug-projects-frame.mjs` - Projects frame debug
- `/qa/debug-scroll.spec.ts` - Scroll spec tests
- `/qa/debug-scroll2.spec.ts` - Scroll2 spec tests
- `/qa/debug-scroll-timing.mjs` - Scroll timing debug
- `/qa/debug-test.test.ts` - Debug test
- `/qa/devtools-inspection.js` - Devtools inspection
- `/qa/devtools-launch.js` - Devtools launch
- `/qa/final-check.mjs` - Final check
- `/qa/final-functional-test.mjs` - Final functional test
- `/qa/final-verification.test.ts` - Final verification
- `/qa/final-verification-clean.test.ts` - Clean final verification
- `/qa/final-verification-fixed.test.ts` - Fixed final verification
- `/qa/final-verify.mjs` - Final verify
- `/qa/final-visual-verification.mjs` - Final visual verification
- `/qa/legacy-check.js` - Legacy check
- `/qa/legacy-check.mjs` - Legacy check mjs
- `/qa/manual-verification.js` - Manual verification
- `/qa/manual-verification.mjs` - Manual verification mjs
- `/qa/run_cloud_spec.mjs` - Run cloud spec
- `/qa/selfcheck-loop.mjs` - Self check loop
- `/qa/skills-interaction.test.ts` - Skills interaction test
- `/qa/skills-interaction-final.test.ts` - Final skills interaction test
- `/qa/skills-projects-interaction.spec.ts` - Skills projects interaction spec
- `/qa/specific-legacy-check.mjs` - Specific legacy check
- `/qa/verify-cloud-world.spec.ts` - Verify cloud world spec
- `/qa/verify-rightward.mjs` - Verify rightward
- `/qa/verify-v3.mjs` - Verify v3
- `/qa/verify-v4.mjs` - Verify v4
- `/qa/verify-v7.mjs` - Verify v7
- `/qa/visual-inspection.mjs` - Visual inspection
- `/qa/visual-inspection2.mjs` - Visual inspection 2
- `/qa/visual-inspection-v2.mjs` - Visual inspection v2
- `/qa/cloud-world-1280-enhanced/` - Enhanced cloud world directory

### Cloud World QA Directories
- `/qa/ezgif-split/` - Original extracted frames before renaming
- `/qa/frame-analysis/` - Frame analysis directory
- `/qa/phase1/` - Phase 1 directory
- `/qa/phase2/` - Phase 2 directory
- `/qa/screenshots/` - Screenshots directory
- `/qa/_legacy-2026-09-30/` - Legacy directory
- `/qa/_scratch-e/` - Scratch directory

### Cloud World Scripts and Tools
- `/capture-detailed.cjs` - Detailed capture script
- `/capture-exact-frames.mjs` - Exact frames capture
- `/capture-frames.cjs` - Frames capture
- `/capture-rxverify.mjs` - Rxverify capture
- `/capture-screenshots.mjs` - Screenshots capture
- `/capture-visual-qa.mjs` - Visual QA capture
- `/cdp-verify.cjs` - CDP verify
- `/cdp-verify.js` - CDP verify js
- `/diagnose-cloud.mjs` - Diagnose cloud
- `/inspect-cloud.mjs` - Inspect cloud
- `/inspect-cloud-better.js` - Inspect cloud better
- `/inspect-cloud-dom.mjs` - Inspect cloud DOM
- `/inspect-full.js` - Inspect full
- `/inspect-full.mjs` - Inspect full mjs
- `/run_full_test.sh` - Run full test
- `/run_test_with_serve.sh` - Run test with serve
- `/run_test_with_server.sh` - Run test with server
- `/run_tests.sh` - Run tests
- `/test-browser.js` - Test browser
- `/dev.log` - Development log

### Cloud World Documentation and Plans
- `/CLOUD_WORLD_FINAL_PLAN_CORRECTED.md` - Final plan corrected
- `/CLOUD_WORLD_FINAL_REPORT.md` - Final report
- `/CLOUD_WORLD_FINAL_SUMMARY.md` - Final summary
- `/CLOUD_WORLD_IMPLEMENTATION_PLAN.md` - Implementation plan
- `/CLOUD_WORLD_IMPLEMENTATION_SUMMARY.md` - Implementation summary
- `/CLOUD_WORLD_REDESIGN_PLAN.md` - Redesign plan
- `/FINAL_CLOUD_WORLD_REPORT.md` - Final cloud world report
- `/FINAL_QA_REVIEW_REPORT.md` - Final QA review report
- `/FINAL_VERIFICATION_SUMMARY.md` - Final verification summary
- `/IMPLEMENTATION_COMPLETION_SUMMARY.md` - Implementation completion summary
- `/PHASE1_COMPLETION_PLAN.md` - Phase 1 completion plan
- `/PROJECT_PLAN.md` - Project plan (shared - see shared files)
- `/reference/` - Reference directory (contains videos - shared with data world - see shared files)

### Cloud World Public HTML
- `/public/cloud-verify.html` - Cloud verify HTML

## 2. Files and Directories to RETAIN (Data World and Shared)

These must be preserved as they belong to Data World or are shared:

### Data World Core (MUST REMAIN UNTOUCHED)
- `/src/game/` - Entire game directory (Phaser game engine)
- `/src/content/worlds.data.ts` - **PARTIALLY RETAIN** - Only the 'data' world configuration must be preserved; the 'cloud' world configuration can be removed
- `/src/content/types.ts` - Shared types (MUST RETAIN)
- `/src/content/index.ts` - Shared content index (MUST RETAIN)
- `/src/content/projects.data.ts` - Data world projects (MUST RETAIN)
- `/src/content/skills.data.ts` - Data world skills (MUST RETAIN)
- `/src/content/data/` - Data directory (MUST RETAIN)

### Shared Components (Used by Both Worlds)
- `/src/components/Hero/` - Hero component (used by both worlds)
- `/src/components/InfoPanel.css` - Info panel styles (shared)
- `/src/components/InfoPanel.tsx` - Info panel component (shared)
- `/src/components/WorldShell.css` - World shell styles (shared)
- `/src/components/WorldShell.tsx` - World shell component (shared - contains the React-Phaser boundary)
- `/src/cinematic/` - Cinematic hero components (used by hero section)
- `/src/hooks/useReducedMotion.ts` - Shared hook
- `/src/store/gameStore.ts` - Shared game state store
- `/src/styles/` - Shared styles directory
- `/src/vite-env.d.ts` - Shared Vite env
- `/src/App.css` - Shared app styles
- `/src/App.tsx` - **PARTIALLY MODIFY** - Need to remove cloud world import and reference, keep data world and hero
- `/src/main.tsx` - Shared main entry
- `/src/index.css` - Shared index styles

### Shared Assets
- `/public/assets/dashboards/` - Dashboard images (used by data world projects)
- `/public/data/` - Data directory (used by data world)
- `/public/favicon.svg` - Shared favicon
- `/public/icons.svg` - Shared icons
- `/public/prototypes/` - Prototypes directory (shared)
- `/reference/` - Reference videos (may be shared, but need to verify - currently appears to be reference material)

### Shared Configuration
- `/package.json` - Shared package configuration
- `/tsconfig.json` - Shared TypeScript config
- `/tsconfig.app.json` - Shared app TypeScript config
- `/tsconfig.node.json` - Shared node TypeScript config
- `/vite.config.ts` - Shared Vite configuration
- `/playwright.config.ts` - Shared Playwright config
- `/oxlintrc.json` - Shared linter config
- `.gitignore` - Shared git ignore
- `.gitattributes` - Shared git attributes
- `.hermes/` - Hermes directory (shared)
- `/README.md` - Shared readme
- `/LICENSE` - License if present

### Shared Tests (Data World Only)
- `/tests/` - Test directory (contains data world tests - need to verify, but appears to be cloud world only based on earlier listing)
  - Actually `/tests/cloud-world.test.ts` is cloud world only, so this entire directory can be deleted if it only contains cloud world tests

### Data World Specific Assets to Verify
Need to check if any assets in `/public/assets/` are exclusively for data world:
- `/public/assets/skill-icons.svg` - If exists, likely shared
- Other asset files need inspection

## 3. Shared Files Requiring Modification

These files contain references to both worlds and need selective modification:

### `/src/App.tsx`
- Remove Cloud World import: `import { CinematicCloudWorldNew } from './cloud-world/CinematicCloudWorldNew';`
- Remove Cloud World from HASH_WORLDS: Remove or comment out `#/cloud-world': 'cloud-world'`
- Remove Cloud World case in `worldForHash` function (handled by hash map removal)
- Remove Cloud World case in render: Remove `{currentWorld === 'cloud-world' && (<CinematicCloudWorldNew key=\"cloud-world\" onExit={returnToHero} />)}`

### `/src/content/worlds.data.ts`
- Remove the entire 'cloud' world configuration object (lines 45-69), keeping only the 'data' world configuration
- Preserve the comment about Kubernetes placement as it may be relevant for future reference

### `/src/game/config/worldConfig.ts`
- Remove the cloud world palette configuration, keeping only the data world palette
- Preserve the file structure as it's needed for data world

### `/src/content/index.ts`
- This exports the content. Need to check if it imports/exports cloud world specific content:
  - If it exports `CLOUD_SKILLS` or `CLOUD_PROJECTS`, remove those exports
  - If it exports `CLOUD_WORLDS` or similar, remove cloud world references
  - Keep data world exports

### `/src/content/projects.cloud.ts` and `/src/content/skills.cloud.ts`
- These will be deleted entirely, so no modification needed

### `/src/content/types.ts`
- This is shared and should remain unchanged as it defines the core types used by both worlds

## 4. Assets That Can Be Reused

These assets may have value in the new 3D implementation:

### Potentially Reusable
- `/public/assets/skills-valley.png` - Could be used as texture or reference for skills valley in 3D
- `/public/assets/projects-sunset.png` - Could be used as texture or reference for projects sunset in 3D
- `/public/assets/ending.png` - Could be reused as ending screen
- `/public/assets/cloud-poster.svg` - Vector art might be usable as reference
- `/public/assets/cloud-master.png` and `/public/assets/cloud-master-transparent.png` - High resolution cloud textures might be usable
- `/reference/` - The reference videos (authoritative-reference.mp4 and selection-transition.mp4) provide valuable visual reference for the new 3D implementation

### Not Recommended for Reuse
- `/public/assets/ezgif-split/` - The extracted frame sequence is specific to the old video-frame approach and won't be needed in the 3D approach
- Individual frame files in `/left side/` and `/right side/` - These appear to be original source frames with delay metadata, not needed for 3D

## 5. Dependencies That Can Eventually Be Removed

These dependencies are primarily used by the old Cloud World implementation:

### Safe to Remove After Cleanup
- `gsap` - Used for ScrollTrigger animations in old Cloud World
- `@fontsource/league-gothic` - Used specifically for Cloud World UI
- `@fontsource/archivo-black` - Used specifically for Cloud World UI
- `@fontsource/bebas-neue` - Potentially used for Cloud World

### Dependencies to Keep (Used by Data World or Shared)
- `phaser` - Used by Data World game engine
- `react` and `react-dom` - Core framework
- `zustand` - State management (used by both worlds)
- `@fontsource/archivo-narrow` - Potentially used by Data World
- `@fontsource/oswald` - Potentially used by Data World
- `@fontsource/barlow-condensed` - Potentially used by Data World

### Dev Dependencies to Review
- `@playwright/test` and `playwright` - Used for testing (keep if Data World has tests)
- `@types/*` - TypeScript definitions (keep)
- `oxlint` - Linter (keep)
- `typescript` - TypeScript (keep)
- `vite` - Build tool (keep)
- `@vitejs/plugin-react` - React plugin for Vite (keep)
- `pngjs` - PNG manipulation (check if used by Data World)

## 6. Potential Effects on Routing, Builds, Tests, and Data World

### Routing
- Remove `/#/cloud-world` route from application
- Hero world routing remains unchanged (`/` and `/#/data-world`)
- Hash-based navigation in App.tsx will need updating as described above

### Builds
- Vite build should proceed normally after removing Cloud World imports
- No build errors expected from removed files if imports are properly cleaned up
- Assets removed from public directory will reduce build size

### Tests
- All Cloud World specific tests will be removed (listed in section 1)
- Need to verify Data World tests still pass
- Playwright configuration may need updating if it references Cloud World specific selectors

### Data World Protection
- As specified, Data World must remain completely untouched
- All game engine code (`/src/game/`) is preserved
- All data world content (`/src/content/projects.data.ts`, `/src/content/skills.data.ts`, etc.) is preserved
- Shared components that Data World relies on are preserved with only Cloud World specific parts removed
- The WorldShell component (React-Phaser boundary) is preserved as it's used by Data World

## 7. New Cloud World Direction Implementation Plan

### Proposed Technology Stack (as outlined in instructions)
- Keep existing Vite + React + TypeScript application
- Add Three.js with React Three Fiber (`@react-three/fiber`, `three`)
- Add Drei for 3D helpers (`@react-three/drei`)
- Add Motion for React (`framer-motion`)
- Keep React and CSS for UI components
- Consider 21st.dev or VibeUI components only if they genuinely fit

### Implementation Phases

#### Phase 1: Cleanup (Current Phase)
- Delete all Cloud World specific files as listed
- Modify shared files to remove Cloud World references
- Verify Data World still builds and runs correctly
- Commit cleanup as a separate change

#### Phase 2: Foundation
- Install new 3D dependencies: `three`, `@react-three/fiber`, `@react-three/drei`, `framer-motion`
- Create basic 3D scene with camera, lighting, and controls
- Implement basic cloud-like primitive or load test model
- Ensure 3D rendering works in React component

#### Phase 3: Landscape and Environment
- Create or import 3D landscape models based on reference images
- Implement valley and mountain environments
- Add basic environmental animation (clouds, wind, etc.)
- Implement camera paths for guided exploration

#### Phase 4: Interactive Elements
- Implement cloud interaction system for skills and projects
- Create skill/project display panels that appear on interaction
- Implement smooth transitions between states
- Add entrance/exit animations for panels

#### Phase 5: Content Integration
- Connect to existing data.ts files for skill and project content
- Render skill information dynamically from `skills.data.ts` (for cloud world skills)
- Render project information dynamically from `projects.data.ts` (for cloud world projects)
- Implement external links for projects

#### Phase 6: Polish and Optimization
- Optimize 3D models and textures
- Implement proper lighting and materials
- Add post-processing effects if desired
- Ensure responsive design works across devices
- Implement accessibility features
- Performance optimization and testing

### Verification Steps for Each Phase
1. Visual inspection matches reference videos/screenshots
2. All skill and project information displays correctly
3. Navigation works smoothly between hero, data world, and cloud world
4. Responsive design works on mobile and desktop
5. Accessibility controls functional (keyboard navigation, screen readers)
6. Performance targets met (60fps goal)
7. No console errors in production build