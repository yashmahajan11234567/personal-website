# Cloud World — Phase 2: Mountain Passage and Projects Sunset

Skills Valley visual polish is complete. Begin planning and implementing the next journey segment without destabilizing the existing world.

## Before editing
- Inspect the actual saved code, `git status`, and `git diff`.
- Review `reference/authoritative-reference.mp4`, `reference/selection-transition.mp4`, the flying-through-valley video, and the existing `public/assets/skills-valley.png` and `public/assets/projects-sunset.png`.
- Determine how the current Cloud World represents the final CI/CD skill stop, character movement, world transitions, and scene lifecycle.
- Do not assume the previous reports prove the current visual state; capture a fresh baseline screenshot.
- Do not commit or push.

## Scope and protected areas
- Work only within `src/cloud-world-3d/**` and strictly necessary asset files.
- Do not modify `src/App.tsx`, routing, `src/game/**`, `src/content/worlds.data.ts`, or Data World.
- Preserve the verified post-processing, instanced clouds, FrameDriver, reduced-motion support, WebGL fallback, and existing Skills Valley gameplay.
- Do not add dependencies or generate new assets unless the existing assets cannot reasonably support the design.

## Stage 1 — Plan the transition
Produce a short implementation plan before coding.

Define:
1. The trigger for entering Mountain Passage after the final CI/CD stop.
2. How the character and camera move through the passage.
3. How the existing Skills Valley scene is preserved or unloaded safely.
4. How the passage transitions into Projects Sunset.
5. How loading, failure, keyboard controls, reduced motion, and returning to the previous area behave.

Use the supplied reference videos as the visual authority. Avoid an abrupt route change or a generic loading screen unless the reference requires it.

## Stage 2 — Mountain Passage
- Create a visually rich passage using the existing landscape assets and established sunset palette.
- Use layered mountains, cliffs, pine silhouettes, atmospheric fog, and controlled lighting where appropriate.
- Make the forward path and destination visually clear.
- Preserve responsive camera behavior and character control.
- Keep geometry and materials efficient.

## Stage 3 — Projects Sunset
- Build a distinct, wide destination that feels like a natural continuation of the journey.
- Establish a clear landing area and readable, discoverable project markers.
- Implement project-detail overlays using existing React UI patterns.
- Use only verified project data and real repository/demo URLs already present in the project. Do not invent project claims or links.

## Stage 4 — Verification
- Capture fresh screenshots at 1440×900 throughout the transition and in the Projects destination.
- Inspect the actual images and compare them with the supplied references.
- Test the transition from the final skill, character movement, camera controls, marker interactions, overlays, Escape behavior, and reduced motion.
- Run `npm run build` and inspect browser console errors.
- Preserve all working Skills Valley behavior.

If a significant transition decision is ambiguous, stop and ask before committing to an irreversible architectural change.

## Final report
List changed files, provide fresh screenshots, report build and interaction tests, and identify remaining defects.

Do not commit or push.