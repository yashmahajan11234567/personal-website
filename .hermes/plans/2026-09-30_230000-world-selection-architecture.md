# Pixel Portfolio Game - Phase 1 World Selection Architecture Resolution

## Goal
Determine and implement the correct visual architecture for world selection at the cinematic hero's selection phase, ensuring both Data and Cloud paths are genuinely visible and selectable within the frame sequence cinematic — not as HTML overlays — based on actual reference video/frame analysis.

---

## Current Context / Assumptions

### Frame Sequence Analysis (from extracted timing data):

**Left (Data) - 232 frames, 11.04s total:**
| Progress | Time | Frame | Notes |
|----------|------|-------|-------|
| 72% | 8.0s | 181 | Selection phase begins |
| 77% | 8.5s | 193 | |
| 82% | 9.0s | 205 | |
| 86% | 9.5s | 217 | |
| 91% | 10.0s | 228 | Long delay (0.833s) - hold frame |
| 95% | 10.5s | 228 | Same frame held |
| 100% | 11.0s | 231 | Final frame |

**Right (Cloud) - 223 frames, 11.96s total:**
| Progress | Time | Frame | Notes |
|----------|------|-------|-------|
| 71% | 8.5s | 201 | Selection phase begins |
| 75% | 9.0s | 214 | Long delay (0.8s) - hold frame |
| 79% | 9.5s | 214 | Same frame held |
| 84% | 10.0s | 217 | |
| 88% | 10.5s | 217 | Long delay (0.92s) - hold frame |
| 92% | 11.0s | 220 | Long delay (0.92s) - hold frame |
| 96% | 11.5s | 220 | Same frame held |
| 100% | 11.96s | 222 | Final frame |

### Video Frame File Size Analysis (complexity indicator):
- **Left 8.0s (frame 181)**: 486KB - complex composition
- **Left 8.5s (frame 193)**: 262KB  
- **Left 9.0s (frame 205)**: 44KB
- **Left 9.5s (frame 217)**: 29KB
- **Left 10.0s+ (frame 228)**: 15KB - simple/static
- **Right 8.5s (frame 201)**: 39KB
- **Right 9.0s+ (frame 214)**: 17KB - held (0.8s delay)
- **Right 10.0s+ (frame 217)**: 16KB
- **Right 11.0s+ (frame 220)**: 16KB - held (0.92s delay)

**Key Observation**: Both sequences simplify dramatically at the end (15-16KB frames), suggesting the final frames show a relatively static "selection" composition. The long delays (0.8-0.9s) at frames 228/214/217/220 indicate intentional hold points for user decision.

---

## Architecture / Proposed Approach

**The two frame sequences are PATH-SPECIFIC cinematics** — each shows the character/board transforming toward ONE destination. Neither sequence alone shows both choices simultaneously.

**Resolution**: At the selection phase (~72%+ progress), the hero must **composite both sequences** to present the choice visually. The cinematic continuity is maintained by:
1. **Shared intro** (0-72%): Single canvas, blended/interleaved frames
2. **Divergence** (72-86%): Side-by-side or picture-in-picture showing both paths developing
3. **Selection state** (86-100%): Dual canvas showing both final compositions simultaneously — user sees both world endings and chooses
4. **Transition**: On selection, the chosen path's remaining frames play to completion, then handoff to Phaser

**Implementation**: Dual `FrameSequenceCanvas` instances during selection phase, synchronized to their respective progress mappings, with invisible hotspots over each path's visual indicator.

---

## Step-by-Step Tasks

### Task 1: Visual Analysis of Selection-Phase Frames
**Goal**: Determine exact visual content of selection-phase frames for both paths.

**Commands**:
```bash
# Create side-by-side comparison images for visual analysis
python qa/analyze_selection_frames.py
```

**Script** (`qa/analyze_selection_frames.py`):
```python
from PIL import Image
import os

# Load key frames from both sequences at selection timestamps
selection_frames = {
    'left': [181, 193, 205, 217, 228, 231],
    'right': [201, 214, 217, 220, 222]
}

for side, frames in selection_frames.items():
    print(f'=== {side.upper()} SELECTION FRAMES ===')
    for f_idx in frames:
        # Find file
        dir_path = f'C:/Users/hitoy/Downloads/portfolio_website/{side} side'
        files = [f for f in os.listdir(dir_path) if f.startswith(f'frame_{str(f_idx).zfill(3)}_')]
        if files:
            img = Image.open(os.path.join(dir_path, files[0]))
            # Save as PNG for analysis
            img.save(f'qa-selection-analysis/{side}-frame-{f_idx}.png')
            print(f'  Frame {f_idx}: {img.size}')

# Also load video reference frames at same timestamps
video_frames = {
    'left': [8.0, 8.5, 9.0, 9.5, 10.0, 11.0],
    'right': [8.5, 9.0, 9.5, 10.0, 11.0, 11.5]
}
for side, times in video_frames.items():
    for t in times:
        f = f'C:/Users/hitoy/Downloads/portfolio_website/qa-video-{side}-{t}s.png'
        if os.path.exists(f):
            img = Image.open(f)
            img.save(f'qa-selection-analysis/video-{side}-{t}s.png')
            print(f'  Video {side} {t}s: {img.size}')
```

**Verification**: `ls qa-selection-analysis/*.png` shows 12+ comparison images

---

### Task 2: Determine Compositing Strategy
**Goal**: Based on visual analysis, decide HOW to show both paths at selection.

**Decision Matrix** (fill after Task 1):

| Strategy | When Applicable | Implementation |
|----------|-----------------|----------------|
| **Side-by-side split** | Both final frames show board with two distinct paths | Render both canvases at 50% width each |
| **Picture-in-picture** | One path dominant, other as inset | Main canvas + overlay canvas |
| **Cross-fade blend** | Sequences converge to same composition | Alpha blend based on progress |
| **Board-split reveal** | Final frame shows board splitting | Single canvas, frame shows both |

**Output**: Document decision in `src/data/selection-compositing.json`:
```json
{
  "strategy": "side-by-side-split",
  "selectionStartProgress": 0.72,
  "leftCanvasWeight": 0.5,
  "rightCanvasWeight": 0.5,
  "hotspotRegions": {
    "data": { "x": 0.1, "y": 0.4, "width": 0.35, "height": 0.4 },
    "cloud": { "x": 0.55, "y": 0.4, "width": 0.35, "height": 0.4 }
  }
}
```

**Verification**: Visual confirmation that strategy matches reference intent

---

### Task 3: Create Selection Compositing Configuration
**File**: `src/data/selection-compositing.json` (NEW)

```json
{
  "strategy": "side-by-side",
  "phases": {
    "intro": { "progress": [0, 0.23], "mode": "single", "source": "blended" },
    "diverging": { "progress": [0.23, 0.27], "mode": "transition", "source": "interpolate" },
    "dual": { "progress": [0.27, 0.72], "mode": "dual", "source": "both", "layout": "split-vertical" },
    "selection": { "progress": [0.72, 0.86], "mode": "dual", "source": "both", "layout": "split-vertical", "hotspots": true },
    "transition": { "progress": [0.86, 1.0], "mode": "single", "source": "chosen" }
  },
  "layout": {
    "split-vertical": {
      "left": { "x": 0, "y": 0, "width": 0.5, "height": 1.0 },
      "right": { "x": 0.5, "y": 0, "width": 0.5, "height": 1.0 }
    }
  },
  "hotspots": {
    "data": { "x": 0.15, "y": 0.45, "width": 0.3, "height": 0.35 },
    "cloud": { "x": 0.6, "y": 0.45, "width": 0.3, "height": 0.35 }
  },
  "progressMapping": {
    "left": { "selectionStart": 0.72, "selectionEnd": 0.86, "transitionEnd": 1.0 },
    "right": { "selectionStart": 0.71, "selectionEnd": 0.84, "transitionEnd": 1.0 }
  }
}
```

*Values from Task 1 analysis — adjust after visual confirmation*

**Verification**: `cat src/data/selection-compositing.json` valid JSON

---

### Task 4: Update FrameSequenceCanvas for Dual/Composited Rendering
**File**: `src/components/Hero/FrameSequenceCanvas.tsx` (MODIFY)

**Changes**:
- Add `mode` prop: `'single' | 'dual' | 'transition'`
- Add `layout` prop for dual mode positioning
- Add `compositeSide` prop: `'left' | 'right' | 'both'`
- In dual mode: render to offscreen canvas, then composite into main canvas per layout

```typescript
interface FrameSequenceCanvasProps {
  side: 'left' | 'right';
  progress: number;
  mode?: 'single' | 'dual' | 'transition';
  layout?: { x: number; y: number; width: number; height: number };
  compositeSide?: 'left' | 'right' | 'both';
  pendingPath?: 'data' | 'cloud' | null;
}

// In drawFrame: if dual mode, apply layout transform
const drawFrame = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, frame: HTMLImageElement, layout?) => {
  if (layout) {
    // Draw into sub-rectangle of canvas
    const drawW = canvas.width * layout.width;
    const drawH = canvas.height * layout.height;
    const offsetX = canvas.width * layout.x;
    const offsetY = canvas.height * layout.y;
    // ... aspect-correct draw into sub-rect
  } else {
    // Full canvas draw (existing logic)
  }
};
```

**Verification**: Component renders correctly in all three modes

---

### Task 5: Create CinematicHero with Dual-Canvas Selection
**File**: `src/components/Hero/CinematicHero.tsx` (NEW — replaces Hero.tsx)

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { FrameSequenceCanvas } from './FrameSequenceCanvas';
import { cinematicBeats } from '../../data/cinematic-beats';
import { selectionConfig } from '../../data/selection-compositing';
import './CinematicHero.css';

gsap.registerPlugin(ScrollTrigger);

interface CinematicHeroProps {
  onTransitionComplete: (path: 'data' | 'cloud') => void;
}

type HeroPhase = 'intro' | 'diverging' | 'dual' | 'selection' | 'transitioning';

export const CinematicHero = ({ onTransitionComplete }: CinematicHeroProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [phase, setPhase] = useState<HeroPhase>('intro');
  const [pendingPath, setPendingPath] = useState<'data' | 'cloud' | null>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const transitionFired = useRef(false);

  const handleScroll = useCallback((self: ScrollTrigger) => {
    const prog = self.progress;
    setScrollProgress(prog);
    
    // Phase determination from compositing config
    const phases = selectionConfig.phases;
    if (prog < phases.intro.progress[1]) setPhase('intro');
    else if (prog < phases.diverging.progress[1]) setPhase('diverging');
    else if (prog < phases.dual.progress[1]) setPhase('dual');
    else if (prog < phases.selection.progress[1]) setPhase('selection');
    else setPhase('transitioning');
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      onTransitionComplete('data');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: canvas,
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        onUpdate: handleScroll,
      }
    });

    scrollTriggerRef.current = tl.scrollTrigger ?? null;

    return () => {
      tl.kill();
      if (scrollTriggerRef.current) scrollTriggerRef.current.kill();
    };
  }, [onTransitionComplete, reducedMotion, handleScroll]);

  const handlePathSelect = useCallback((path: 'data' | 'cloud') => {
    if (phase !== 'selection' || pendingPath) return;
    
    setPendingPath(path);
    setPhase('transitioning');
    transitionFired.current = true;
    
    // Calculate remaining time for chosen path
    const mapping = selectionConfig.progressMapping[path === 'data' ? 'left' : 'right'];
    const remainingProgress = 1.0 - scrollProgress;
    const remainingTime = remainingProgress * (path === 'data' 
      ? cinematicBeats.left.transitionComplete 
      : cinematicBeats.right.transitionComplete);
    
    setTimeout(() => onTransitionComplete(path), remainingTime * 1000);
  }, [phase, pendingPath, scrollProgress, onTransitionComplete]);

  // Render logic based on phase
  const config = selectionConfig.phases[phase];
  const isDual = config?.mode === 'dual';
  const layout = isDual ? selectionConfig.layout[config.layout as keyof typeof selectionConfig.layout] : null;

  return (
    <div ref={canvasRef} className="cinematic-hero">
      {/* Single canvas that composites everything */}
      <canvas 
        id="cinematic-canvas" 
        width={1920} 
        height={1080}
        className="cinematic-hero__canvas"
        aria-hidden="true"
      />
      
      {/* FrameSequenceCanvas instances - managed by parent */}
      {isDual ? (
        <>
          <FrameSequenceCanvas
            side="left"
            progress={scrollProgress}
            mode="dual"
            layout={layout.left}
            compositeSide="left"
            ref={leftCanvasRef}
          />
          <FrameSequenceCanvas
            side="right"
            progress={scrollProgress}
            mode="dual"
            layout={layout.right}
            compositeSide="right"
            ref={rightCanvasRef}
          />
        </>
      ) : (
        <FrameSequenceCanvas
          side={pendingPath || 'left'}
          progress={scrollProgress}
          mode="single"
          compositeSide="both"
        />
      )}
      
      {/* Selection hotspots - positioned per compositing config */}
      {phase === 'selection' && (
        <div className="cinematic-hero__hotspot-layer" aria-hidden="true">
          <button
            className="cinematic-hero__hotspot cinematic-hero__hotspot--data"
            onClick={() => handlePathSelect('data')}
            aria-label="Enter Data Analyst / Data Engineer world"
            style={{
              left: `${selectionConfig.hotspots.data.x * 100}%`,
              top: `${selectionConfig.hotspots.data.y * 100}%`,
              width: `${selectionConfig.hotspots.data.width * 100}%`,
              height: `${selectionConfig.hotspots.data.height * 100}%`,
            }}
          />
          <button
            className="cinematic-hero__hotspot cinematic-hero__hotspot--cloud"
            onClick={() => handlePathSelect('cloud')}
            aria-label="Enter Cloud / DevOps world"
            style={{
              left: `${selectionConfig.hotspots.cloud.x * 100}%`,
              top: `${selectionConfig.hotspots.cloud.y * 100}%`,
              width: `${selectionConfig.hotspots.cloud.width * 100}%`,
              height: `${selectionConfig.hotspots.cloud.height * 100}%`,
            }}
          />
        </div>
      )}
      
      {/* Accessibility */}
      <div className="cinematic-hero__a11y" aria-live="polite" aria-atomic="true">
        {phase === 'intro' && 'Cinematic introduction: Personal Portfolio'}
        {phase === 'diverging' && 'Paths diverging: Data and Cloud journeys begin'}
        {phase === 'dual' && 'Both paths visible: Data on left, Cloud on right'}
        {phase === 'selection' && 'Choose your path: Data (left) or Cloud (right)'}
        {phase === 'transitioning' && `Entering ${pendingPath} world`}
      </div>
    </div>
  );
};

export default CinematicHero;
```

**Verification**: 
- `npm run build` passes
- Dual canvas renders both sequences side-by-side at selection phase
- Hotspots align with visual path indicators

---

### Task 6: CinematicHero CSS for Dual Canvas
**File**: `src/components/Hero/CinematicHero.css` (NEW)

```css
@import '../../styles/variables.css';

.cinematic-hero {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--color-bg);
}

.cinematic-hero__canvas {
  display: block;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

/* FrameSequenceCanvas instances render to this main canvas via offscreen drawing */
.cinematic-hero frame-sequence-canvas {
  display: none; /* Hidden - they draw to main canvas */
}

/* Hotspot layer - invisible buttons over visual path indicators */
.cinematic-hero__hotspot-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.cinematic-hero__hotspot {
  position: absolute;
  pointer-events: auto;
  background: transparent;
  border: none;
  cursor: pointer;
  /* Visual feedback for debugging - remove in production */
  /* outline: 2px dashed rgba(255,0,0,0.5); */
}

.cinematic-hero__hotspot:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Phase-specific canvas behavior */
.cinematic-hero[data-phase="intro"] .cinematic-hero__canvas { /* single */ }
.cinematic-hero[data-phase="dual"] .cinematic-hero__canvas { /* composited */ }
.cinematic-hero[data-phase="selection"] .cinematic-hero__canvas { /* composited with hotspots */ }

/* Reduced motion: jump to selection state */
@media (prefers-reduced-motion: reduce) {
  .cinematic-hero {
    height: auto;
    min-height: 100vh;
  }
  .cinematic-hero__hotspot-layer {
    display: none;
  }
}

/* Accessibility */
.cinematic-hero__a11y {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

**Verification**: Dual canvas renders correctly, hotspots positioned per config

---

### Task 7: Update App.tsx — Direct Hero-to-World Transition
**File**: `src/App.tsx` (MODIFY)

```typescript
import { useEffect, useState } from 'react';
import { CinematicHero } from './components/Hero/CinematicHero';
import { useGameStore } from './store/gameStore';
import './App.css';

function App() {
  const { currentWorld, setCurrentWorld } = useGameStore();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#/data-world') setCurrentWorld('data-world');
    else if (hash === '#/cloud-world') setCurrentWorld('cloud-world');
  }, [setCurrentWorld]);

  const handleHeroTransitionComplete = (path: 'data' | 'cloud') => {
    setCurrentWorld(`${path}-world`);
    window.location.hash = `#/${path}-world`;
  };

  const handleError = () => setHasError(true);

  if (hasError) return <div style={{ padding: '2rem', color: 'red' }}>Error. Check console.</div>;

  return (
    <div className="app">
      <a href="#main" className="skip-link">Skip to main content</a>
      <main id="main" onError={handleError}>
        {currentWorld === 'hero' && (
          <CinematicHero onTransitionComplete={handleHeroTransitionComplete} />
        )}
        {currentWorld === 'data-world' && (
          <div className="placeholder-world" data-theme="dark">
            <h1>Data World — Phase 2</h1>
            <button onClick={() => { setCurrentWorld('hero'); window.location.hash = ''; }}>Back</button>
          </div>
        )}
        {currentWorld === 'cloud-world' && (
          <div className="placeholder-world" data-theme="dark">
            <h1>Cloud World — Phase 2</h1>
            <button onClick={() => { setCurrentWorld('hero'); window.location.hash = ''; }}>Back</button>
          </div>
        )}
        {currentWorld === 'experience' && (
          <div className="placeholder-world"><h1>Experience — Phase 5</h1></div>
        )}
      </main>
    </div>
  );
}

export default App;
```

**Verification**: No `path-selection` state, direct transition hero → data-world/cloud-world

---

### Task 8: Update GameStore — Remove path-selection
**File**: `src/store/gameStore.ts` (MODIFY)

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export type World = 'hero' | 'data-world' | 'cloud-world' | 'experience';

export interface GameState {
  currentWorld: World;
  setCurrentWorld: (world: World) => void;
  reset: () => void;
}

const initialState = { currentWorld: 'hero' as World };

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set) => ({
    ...initialState,
    setCurrentWorld: (world) => set({ currentWorld: world }),
    reset: () => set(initialState),
  }))
);
```

**Verification**: TypeScript compiles, no `path-selection` in World type

---

### Task 9: Delete PathSelection Component
**Files**: DELETE
- `src/components/PathSelection/PathSelection.tsx`
- `src/components/PathSelection/PathSelection.css`
- `src/components/PathSelection/index.ts`

**Verification**: `npm run build` passes with no PathSelection imports

---

### Task 10: Update Visual QA for Cinematic Beats + Dual Canvas
**File**: `qa/visual-qa.spec.ts` (MODIFY)

```typescript
const CINEMATIC_BEATS = [
  { name: 'intro-0', progress: 0.0, phase: 'intro' },
  { name: 'intro-25', progress: 0.1, phase: 'intro' },
  { name: 'intro-50', progress: 0.2, phase: 'intro' },
  { name: 'intro-end', progress: 0.23, phase: 'intro' },
  { name: 'diverging-start', progress: 0.25, phase: 'diverging' },
  { name: 'diverging-end', progress: 0.27, phase: 'diverging' },
  { name: 'dual-25', progress: 0.35, phase: 'dual' },
  { name: 'dual-50', progress: 0.50, phase: 'dual' },
  { name: 'dual-75', progress: 0.65, phase: 'dual' },
  { name: 'selection-start', progress: 0.72, phase: 'selection', hotspots: true },
  { name: 'selection-mid', progress: 0.80, phase: 'selection', hotspots: true },
  { name: 'selection-commit', progress: 0.86, phase: 'selection', hotspots: true },
  { name: 'transition-mid', progress: 0.93, phase: 'transitioning' },
  { name: 'transition-end', progress: 1.0, phase: 'transitioning' },
];

test.describe('Phase 1 Visual QA - Cinematic Hero', () => {
  for (const beat of CINEMATIC_BEATS) {
    test(`Cinematic at ${beat.name} (${beat.progress * 100}%)`, async ({ page }) => {
      await scrollToBeat(page, beat.progress);
      await page.waitForTimeout(500);
      
      // Capture main canvas
      const canvas = page.locator('#cinematic-canvas');
      await expect(canvas).toBeVisible();
      await canvas.screenshot({ 
        path: path.join(OUTPUT_DIR, `cinematic-${beat.name}.png`) 
      });
      
      // Verify phase indicator
      const phaseIndicator = page.locator('.cinematic-hero');
      await expect(phaseIndicator).toHaveAttribute('data-phase', beat.phase);
    });
  }

  test('Selection hotspots visible and clickable', async ({ page }) => {
    await scrollToBeat(page, 0.75); // In selection phase
    await page.waitForTimeout(500);
    
    const dataHotspot = page.locator('.cinematic-hero__hotspot--data');
    const cloudHotspot = page.locator('.cinematic-hero__hotspot--cloud');
    
    await expect(dataHotspot).toBeVisible();
    await expect(cloudHotspot).toBeVisible();
    
    // Click data hotspot
    await dataHotspot.click();
    await page.waitForTimeout(2000);
    
    // Should transition to data-world
    await expect(page.locator('.data-world')).toBeVisible();
  });

  test('Reduced motion skips to selection', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    
    // Should be in data-world or selection phase immediately
    const dataWorld = page.locator('.data-world, .cinematic-hero[data-phase="selection"]');
    await expect(dataWorld.first()).toBeVisible({ timeout: 5000 });
  });
});
```

**Verification**: All 14+ beat tests pass, hotspot click test passes

---

### Task 11: Extract Cinematic Reference Frames for QA
**File**: `qa/extract-cinematic-references.py` (NEW)

```python
#!/usr/bin/env python3
"""Extract reference frames at cinematic beats for pixel-diff comparison."""

import cv2
import os

VIDEO_MAP = {
    'left': 'C:/Users/hitoy/Downloads/start-to-left.mp4',
    'right': 'C:/Users/hitoy/Downloads/start-to-right.mp4'
}

BEATS = {
    'left': [0.0, 2.5, 3.0, 4.0, 6.0, 8.0, 8.5, 9.0, 9.5, 10.0, 11.0],
    'right': [0.0, 2.5, 3.0, 4.0, 6.0, 8.5, 9.0, 9.5, 10.0, 11.0, 11.5, 11.96]
}

os.makedirs('qa-reference-cinematic', exist_ok=True)

for side, video_path in VIDEO_MAP.items():
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    for beat_time in BEATS[side]:
        frame_idx = int(beat_time * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if ret:
            filename = f'qa-reference-cinematic/{side}-{beat_time:.1f}s.png'
            cv2.imwrite(filename, frame)
            print(f'Saved {filename} (frame {frame_idx})')
    
    cap.release()

# Also extract from frame sequences for exact frame comparison
print('Extracting exact frames from WebP sequences...')
# ... load delays, find frame indices, save WebP frames as PNG
```

**Verification**: `ls qa-reference-cinematic/*.png` shows 23+ reference frames

---

### Task 12: Run Complete Visual QA & Pixel-Diff
**Commands**:
```bash
# 1. Build
npm run build

# 2. Start dev server
npm run dev -- --host 0.0.0.0 --port 5173 &
sleep 5 && curl -s -o /dev/null -w "%{http_code}" http://localhost:5173

# 3. Extract reference frames
python qa/extract-cinematic-references.py

# 4. Run visual QA
npx playwright test qa/visual-qa.spec.ts --headed

# 5. Pixel-diff comparison
python qa/compare_cinematic.py

# 6. Stop server
pkill -f "vite"
```

**Pixel-Diff Script** (`qa/compare_cinematic.py`):
```python
import cv2
import numpy as np
from pathlib import Path

REF_DIR = Path('qa-reference-cinematic')
SCREEN_DIR = Path('qa-screenshots')

def compare(ref_path, screen_path):
    ref = cv2.imread(str(ref_path))
    screen = cv2.imread(str(screen_path))
    if ref is None or screen is None:
        return None
    # Resize screen to match ref if needed
    if screen.shape != ref.shape:
        screen = cv2.resize(screen, (ref.shape[1], ref.shape[0]))
    diff = cv2.absdiff(ref, screen)
    gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    non_zero = np.count_nonzero(gray)
    pct = (non_zero / gray.size) * 100
    return pct

# Compare each beat
for ref_file in sorted(REF_DIR.glob('*.png')):
    name = ref_file.stem
    screen_file = SCREEN_DIR / f'cinematic-{name}.png'
    if screen_file.exists():
        pct = compare(ref_file, screen_file)
        status = 'PASS' if pct < 0.5 else 'FAIL'
        print(f'{name}: {pct:.2f}% {status}')
    else:
        print(f'{name}: NO SCREENSHOT')
```

**Expected Output**: All beats PASS (<0.5% pixel mismatch)

---

### Task 13: Accessibility & Reduced Motion Verification
**Checklist**:
- [ ] `prefers-reduced-motion: reduce` → jumps to selection phase or final state
- [ ] Keyboard: Tab navigates to hotspots, Enter/Space activates
- [ ] Screen reader: `aria-live` announces phase changes
- [ ] Focus visible: Hotspots show focus ring
- [ ] Touch targets: Hotspots ≥44×44px on mobile
- [ ] Color contrast: Any visible text meets WCAG AA

**Test**:
```bash
npx playwright test qa/accessibility.spec.ts --headed
```

---

### Task 14: Code Review, Lint, Document
**Commands**:
```bash
# Lint
npx oxlint src/**/*.tsx

# Type check
npx tsc --noEmit

# Build
npm run build

# Update lessons
echo "## Phase 1 World Selection Architecture - $(date)" >> .gsd/LESSONS.md
echo "- Compositing strategy: side-by-side dual canvas at selection phase" >> .gsd/LESSONS.md
echo "- Selection phase: 72-86% progress, both sequences visible" >> .gsd/LESSONS.md
echo "- Hotspots positioned over visual path indicators in final frames" >> .gsd/LESSONS.md
echo "- PathSelection component deleted — selection is cinematic" >> .gsd/LESSONS.md
echo "" >> .gsd/LESSONS.md
```

---

## Tests / Validation

### For Task 1 (Visual Analysis):
- **Test**: Manual inspection of extracted frames
- **Verification**: Document what each selection-phase frame shows

### For Task 2 (Strategy Decision):
- **Test**: Visual comparison of strategies against references
- **Verification**: Chosen strategy matches reference intent

### For Task 3-5 (Implementation):
- **TDD**: Write failing test for dual-canvas rendering first
  ```typescript
  test('dual mode renders both sequences side by side', () => {
    render(<FrameSequenceCanvas side="left" progress={0.8} mode="dual" layout={{x:0,y:0,width:0.5,height:1}} />);
    render(<FrameSequenceCanvas side="right" progress={0.8} mode="dual" layout={{x:0.5,y:0,width:0.5,height:1}} />);
    // Verify both draw to main canvas in correct halves
  });
  ```
- **Implementation**: Build components
- **Verification**: Tests pass, visual QA matches

### For Task 10-12 (Visual QA):
- **Test**: Run full beat-based visual QA
- **Verification**: All 14 beats PASS pixel-diff (<0.5%), hotspot click transitions to correct world

### For Task 13 (Accessibility):
- **Test**: axe-core + manual keyboard/screen reader
- **Verification**: No violations, all criteria met

### For Task 14 (Code Quality):
- **Test**: Lint, typecheck, build
- **Verification**: Clean reports

---

## Risks, Tradeoffs, and Open Questions

### Risks:
1. **Dual canvas performance**: Two FrameSequenceCanvas instances loading frames simultaneously during dual/selection phases — may need shared cache
2. **Progress synchronization**: Left/right sequences have different total durations — progress mapping must account for this
3. **Hotspot alignment**: Invisible buttons must precisely match visual path indicators — requires exact pixel coordinates from frame analysis
4. **Phaser handoff**: Transition from composited canvas to Phaser canvas needs seamless visual continuity

### Tradeoffs:
- **Dual canvas vs. single composited canvas**: Dual is simpler to implement (reuse existing FrameSequenceCanvas) but uses more memory; single composited canvas is more performant but requires custom compositing logic
- **Side-by-side vs. picture-in-picture**: Side-by-side gives equal visual weight (fair choice) but reduces detail; PiP preserves detail for primary path but biases choice
- **Configuration-driven vs. hardcoded**: Config file allows tuning without code changes but adds complexity

### Open Questions:
1. **Exact hotspot coordinates**: Need pixel-perfect positions from frame analysis (Task 1 output)
2. **Intro blending**: How to show both paths during 0-23% when sequences may differ? (Interleave frames? Show both side-by-side from start?)
3. **Diverging transition**: 23-27% — how to animate from single to dual view? (Split animation? Cross-fade?)
4. **Selection commit behavior**: If user scrolls past selection without clicking? (Auto-choose based on scroll direction? Pause?)
5. **Mobile layout**: Side-by-side halves too narrow on mobile — stack vertically? Show one at a time with swipe?

---

## Next Steps
After this architecture is implemented and validated:
1. **Phase 2**: Phaser 3 gameplay foundation — character controller, world state sync
2. **Phase 3**: Data world — pipe navigation, skill stations, project boxes
3. **Phase 4**: Cloud world — cloud jumping, skill clouds, project clouds
4. **Phase 5**: Experience section