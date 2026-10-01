# Requirements: Pixel Portfolio Game

## Functional Requirements

### FR-1: Hero & Cinematic Transition
- **FR-1.1**: Display "PERSONAL" (left) and "PORTFOLIO" (right) with pixel character centered
- **FR-1.2**: On scroll, "PERSONAL" moves up and "DATA ANALYST / DATA ENGINEER" enters from below
- **FR-1.3**: On scroll, "PORTFOLIO" moves up and "CLOUD / DEVOPS" enters from below
- **FR-1.4**: Character remains fixed in position throughout transition
- **FR-1.5**: Background remains fixed throughout transition
- **FR-1.6**: Animation timing, easing, and proportions match reference video exactly
- **FR-1.7**: No morphing, rotation, ripple, wave, zoom, or camera movement
- **FR-1.8**: No visual artifacts (ghost text, clipping boxes, white bands)

### FR-2: Path Selection
- **FR-2.1**: After transition, present two selectable paths: Data and Cloud/DevOps. **The cinematic
  is monochrome at rest**; world identity appears as a restrained light-blue (Data) / light-orange
  (Cloud) atmospheric glow on hover or focus, returning to monochrome when neither is hovered.
  Accent may intensify during the world transition. *(Amended 2026-10-01 — decision D4; the earlier
  "blue path / orange path" reading is superseded.)*
- **FR-2.2**: Selection happens inside the cinematic, on the information boards themselves. No
  separate selection page, no card grid, no "Choose Your Path" heading.
- **FR-2.3**: Selection transitions cinematically into the corresponding gameplay world
- **FR-2.4**: Overall monochrome aesthetic preserved; accent is decorative and carries no information
- **FR-2.5**: Both boards are real buttons — keyboard reachable, Enter/Space activate, ≥ 44×44 CSS px

### FR-3: Gameplay Foundation (Reusable)
- **FR-3.1**: Phaser 3 scene management for game worlds
- **FR-3.2**: Pixel character sprite with idle, walk, jump animations
- **FR-3.3**: Keyboard controls: ←/A (left), →/D (right), ↑/Space (jump), ↓/S (enter pipe), E (interact), ESC (pause)
- **FR-3.4**: Collision detection with platforms, objects, boundaries
- **FR-3.5**: Camera follows player with smooth interpolation
- **FR-3.6**: React-Phaser bridge for UI overlays (skill/project modals)
- **FR-3.7**: Game state management (current world, position, collected data)

### FR-4: Data Path — Skills World
- **FR-4.1**: Industrial/data aesthetic pixel environment (grayscale + blue accent)
- **FR-4.2**: Skills represented as interactive stations/objects in world
- **FR-4.3**: Player walks/jumps to reach skills
- **FR-4.4**: Interaction (E key) opens skill detail modal with: name, description, proficiency, related tech
- **FR-4.5**: Skills connected via pipe/network visual metaphor (functional reference only)
- **FR-4.6**: Placeholder skill data until real data provided

### FR-5: Data Path — Pipe Transition
- **FR-5.1**: Transparent/semi-transparent pipe object in world
- **FR-5.2**: Player approaches and presses ↓/S to enter
- **FR-5.3**: Avatar visible inside pipe during travel
- **FR-5.4**: Pipe can curve/loop through environment
- **FR-5.5**: Feels like game mechanic, not webpage transition
- **FR-5.6**: Arrives at Projects world seamlessly

### FR-6: Data Path — Projects World
- **FR-6.1**: Projects as interactive objects/stations in environment
- **FR-6.2**: Player moves around and interacts (E key)
- **FR-6.3**: Interaction opens project portfolio interface with: title (GitHub link), description, screenshots, technologies, repo link
- **FR-6.4**: Real project data from repository; placeholders where missing
- **FR-6.5**: "END OF PROJECTS" / "GAME COMPLETE" state after final project

### FR-7: Cloud/DevOps Path (Future Phase)
- **FR-7.1**: Floating cloud platforms aesthetic (grayscale + orange accent)
- **FR-7.2**: Clouds represent skills — jump between them
- **FR-7.3**: Distinct gameplay feel from Data path (not recolored)
- **FR-7.4**: Cloud travel transition to Projects world
- **FR-7.5**: Projects world with Cloud/DevOps projects

### FR-8: Post-Game Shared Sections
- **FR-8.1**: Experience section (timeline/cards)
- **FR-8.2**: Certifications/Courses section
- **FR-8.3**: Contact section
- **FR-8.4**: Standard website scrolling (non-game)

## Non-Functional Requirements

### NFR-1: Performance
- Hero transition: 60fps, <100ms interaction latency
- Game worlds: 60fps on 5-year-old hardware
- Initial load: <3s on 3G

### NFR-2: Accessibility
- Keyboard navigation for all UI
- Reduced motion option disables hero transition
- Screen reader labels for all interactive elements
- Color contrast meets WCAG AA

### NFR-3: Browser Support
- Chrome 100+, Firefox 100+, Safari 15+, Edge 100+
- Mobile: touch controls overlay for gameplay

### NFR-4: Maintainability
- TypeScript strict mode
- ESLint + Prettier
- Component/hook separation
- Phaser scenes as independent modules

## Data Requirements
- Skills list (name, category, description, proficiency, technologies)
- Projects list (title, description, images, technologies, GitHub URL)
- Experience entries (role, company, dates, description)
- Certifications (name, issuer, date, credential URL)
- Contact info (email, LinkedIn, GitHub, etc.)

**All data to be provided by user — use clearly marked placeholders until then.**