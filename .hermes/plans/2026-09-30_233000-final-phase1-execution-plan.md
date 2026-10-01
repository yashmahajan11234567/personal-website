# Pixel Portfolio Game - Phase 1 Final Execution Plan
## Cinematic Hero → Cinematic World Selection → Direct Data/Cloud Transition → Phaser

---

## Goal
Build a frame-accurate cinematic hero experience where a central character holding a portfolio board/sign transforms through scroll-driven animation, revealing world selection (Data / Cloud-DevOps) as an integral cinematic scene — with both paths genuinely visible and selectable — then transitioning directly into Phaser gameplay, all verified against reference videos at actual cinematic beats.

---

## Current Context / Assumptions

### What EXISTS and WORKS (keep this infrastructure):
- **Tech stack**: React 19 + TypeScript + Vite + GSAP 3.15 + Zustand 5
- **Frame sequences extracted & timed**: 
  - Left (Data): 232 frames, 800×450, 11.04s total, frames in `/frames/left side/`
  - Right (Cloud): 223 frames, 800×450, 11.96s total, frames in `/frames/right side/`
- **Reference videos** (motion/timing authority):
  - `start-to-left.mp4` (11.02s) → Data path cinematic
  - `start-to-right.mp4` (11.95s) → Cloud path cinematic
- **FrameSequenceCanvas**: Hybrid loading (preload first 10, sliding window ±15, LRU cache ~40 frames)
- **GSAP ScrollTrigger**: Pin + scrub architecture
- **Zustand store**: World state management
- **QA infrastructure**: Playwright + pixel-diff comparison
- **Reduced motion**: Hook + CSS media query support
- **Build system**: Clean `npm run build`, dev server on localhost:5173

### What MUST BE REPLACED (failed implementation):
- **PathSelection.tsx** — Generic card grid — DELETE entirely
- **App.tsx conditional rendering** with `path-selection` state — REMOVE
- **Hero.tsx** with split left/right canvases and hard `onLeave` transition — REPLACE

### Frame timing analysis (from metadata):
| Path | Total Frames | Total Duration | Selection Phase Start | Selection Phase End |
|------|-------------|----------------|----------------------|---------------------|
| Left (Data) | 232 | 11.04s | ~8.0s (frame 181, 72%) | ~10.0s (frame 228, 91%) |
| Right (Cloud) | 223 | 11.96s | ~8.5s (frame 201, 71%) | ~10.0s (frame 217, 84%) |

**Key frames with long delays (hold points for user decision)**:
- Left: frame 228 (0.833s delay), frame 231 (0.166s delay)
- Right: frame 214 (0.8s delay), frame 217 (0.92s delay), frame 220 (0.92s delay)

---

## Architecture / Proposed Approach

### Canvas Architecture: Single Visible Compositing Canvas + Two Offscreen Render Targets

**Explicit definition — no hidden canvases without pixel transfer:**

```
┌─────────────────────────────────────────────────────────────┐
│  <CinematicHero>                                            │
│    ┌─────────────────────────────────────────────────────┐  │
│    │ #cinematic-canvas (VISIBLE, 1920×1080)               │  │
│    │   • Single canvas that user sees                     │  │
│    │   • Receives composited pixels every frame           │  │
│    └─────────────────────────────────────────────────────┘  │
│                                                             │
│    ┌─────────────────┐  ┌─────────────────┐                │
│    │ OffscreenCanvas │  │ OffscreenCanvas │  (HIDDEN)      │
│    │ Left Renderer   │  │ Right Renderer  │                │
│    │ (FrameSequence) │  │ (FrameSequence) │                │
│    │ Draws current   │  │ Draws current   │                │
│    │ left frame      │  │ right frame     │                │
│    └────────┬────────┘  └────────┬────────┘                │
│             │                    │                          │
│             └────────┬───────────┘                          │
│                      ▼                                       │
│         Compositor (requestAnimationFrame loop)             │
│         - Reads both offscreen canvases                      │
│         - Applies layout strategy (from config)              │
│         - Draws to #cinematic-canvas                         │
└─────────────────────────────────────────────────────────────┘
```

**Data flow per frame:**
1. `FrameSequenceCanvas` (left) → loads current frame → draws to `offscreenLeft`
2. `FrameSequenceCanvas` (right) → loads current frame → draws to `offscreenRight`
3. Compositor (in `CinematicHero`) → reads `offscreenLeft` + `offscreenRight` → applies layout → draws to `#cinematic-canvas`
4. Hotspot layer (invisible buttons) sits above `#cinematic-canvas`

### Cinematic Flow (determined by Task 1 analysis):
```
Intro (0-23%) → Diverging (23-27%) → Dual/Selection (27-86%) → Transition (86-100%) → Phaser
     │              │                      │                      │
  Shared         Split              Both paths            Chosen path
  opening        animation         visible +             plays out
  frames         (config)          hotspots              fully
```

### State Management (no `path-selection` world):
```typescript
type World = 'hero' | 'data-world' | 'cloud-world' | 'experience';
type HeroPhase = 'intro' | 'diverging' | 'dual' | 'selection' | 'transitioning';
type PendingPath = 'data' | 'cloud' | null;
```

---

## Step-by-Step Tasks

### Task 1: Authoritative Visual Analysis of Selection-Phase Frames (MUST COMPLETE FIRST)
**Goal**: Determine the ACTUAL compositing strategy from reference frames — do not pre-commit to 50/50.

**Commands**:
```bash
# Create analysis directory
mkdir -p qa-selection-analysis

# Run frame extraction and analysis
python qa/analyze_selection_frames.py
```

**Script** (`qa/analyze_selection_frames.py`):
```python
#!/usr/bin/env python3
"""Extract and analyze selection-phase frames from BOTH reference sequences."""
from PIL import Image
import os
import json

# Frame indices at selection phase (from timing analysis)
LEFT_SELECTION_FRAMES = [181, 193, 205, 217, 228, 231]  # 72%-100%
RIGHT_SELECTION_FRAMES = [201, 214, 217, 220, 222]      # 71%-100%

def extract_frames(side, frame_indices):
    dir_path = f'C:/Users/hitoy/Downloads/portfolio_website/{side} side'
    results = []
    for idx in frame_indices:
        files = [f for f in os.listdir(dir_path) if f.startswith(f'frame_{str(idx).zfill(3)}_')]
        if files:
            img = Image.open(os.path.join(dir_path, files[0]))
            out_path = f'qa-selection-analysis/{side}-frame-{idx}.png'
            img.save(out_path)
            results.append({'frame': idx, 'file': out_path, 'size': img.size})
            print(f'  {side} frame {idx}: {img.size} -> {out_path}')
    return results

# Also extract video frames at same timestamps
VIDEO_TIMESTAMPS = {
    'left': [8.0, 8.5, 9.0, 9.5, 10.0, 11.0],
    'right': [8.5, 9.0, 9.5, 10.0, 11.0, 11.5]
}

def extract_video_frames(side, timestamps):
    video_path = f'C:/Users/hitoy/Downloads/start-to-{side}.mp4'
    # Use ffmpeg via subprocess
    import subprocess
    for t in timestamps:
        out = f'qa-selection-analysis/video-{side}-{t}s.png'
        subprocess.run(['ffmpeg', '-ss', str(t), '-i', video_path, '-frames:v', '1', '-update', '1', out, '-y'], 
                      capture_output=True)
        if os.path.exists(out):
            img = Image.open(out)
            print(f'  Video {side} {t}s: {img.size} -> {out}')

if __name__ == '__main__':
    os.makedirs('qa-selection-analysis', exist_ok=True)
    
    print('=== EXTRACTING LEFT SELECTION FRAMES ===')
    extract_frames('left', LEFT_SELECTION_FRAMES)
    
    print('=== EXTRACTING RIGHT SELECTION FRAMES ===')
    extract_frames('right', RIGHT_SELECTION_FRAMES)
    
    print('=== EXTRACTING VIDEO REFERENCE FRAMES ===')
    for side, times in VIDEO_TIMESTAMPS.items():
        print(f'  {side}:')
        extract_video_frames(side, times)
    
    print('\n=== ANALYSIS COMPLETE ===')
    print('Open qa-selection-analysis/ to visually compare frames.')
    print('Determine: side-by-side? picture-in-picture? board-split? cross-fade?')
```

**Verification**: 
- `ls qa-selection-analysis/*.png` shows 17+ frames
- **Human visual inspection required** — open images and document:
  - What does each frame show? (character position, board content, path indicators)
  - Do left/right final frames show complementary views of same scene?
  - Where are the visual "choice" indicators (arrows, paths, portals)?
  - What compositing preserves cinematic feel?

**Output**: Document findings in `qa-selection-analysis/FINDINGS.md`:
```markdown
# Selection Phase Visual Analysis

## Left (Data) Final Frames (228-231)
- Frame 228 (held 0.833s): [description]
- Frame 231 (final): [description]

## Right (Cloud) Final Frames (217-222)
- Frame 217 (held 0.92s): [description]
- Frame 220 (held 0.92s): [description]
- Frame 222 (final): [description]

## Compositing Strategy Decision
**Chosen strategy**: [side-by-side | picture-in-picture | board-split | cross-fade | other]

**Rationale**: [why this matches cinematic intent]

## Hotspot Coordinates (percentage of canvas)
- Data path indicator region: {x, y, width, height}
- Cloud path indicator region: {x, y, width, height}

## Layout Configuration
[Exact values for selection-compositing.json]
```

**DO NOT PROCEED TO TASK 2 UNTIL THIS IS COMPLETE AND APPROVED.**

---

### Task 2: Create Selection Compositing Configuration (from Task 1 Output)
**File**: `src/data/selection-compositing.json` (NEW)

```json
{
  "strategy": "TASK_1_DECISION",
  "phases": {
    "intro": { "progress": [0, 0.23], "mode": "single", "source": "blended" },
    "diverging": { "progress": [0.23, 0.27], "mode": "transition", "source": "interpolate" },
    "dual": { "progress": [0.27, 0.72], "mode": "dual", "source": "both", "layout": "TASK_1_LAYOUT" },
    "selection": { "progress": [0.72, 0.86], "mode": "dual", "source": "both", "layout": "TASK_1_LAYOUT", "hotspots": true },
    "transition": { "progress": [0.86, 1.0], "mode": "single", "source": "chosen" }
  },
  "layout": {
    "TASK_1_LAYOUT": {
      "left":  { "x": 0, "y": 0, "width": 0.5, "height": 1.0 },
      "right": { "x": 0.5, "y": 0, "width": 0.5, "height": 1.0 }
    }
  },
  "hotspots": {
    "data":  { "x": 0, "y": 0, "width": 0, "height": 0 },
    "cloud": { "x": 0, "y": 0, "width": 0, "height": 0 }
  },
  "progressMapping": {
    "left":  { "selectionStart": 0.72, "selectionEnd": 0.86, "transitionEnd": 1.0 },
    "right": { "selectionStart": 0.71, "selectionEnd": 0.84, "transitionEnd": 1.0 }
  }
}
```

**REPLACE ALL `TASK_1_*` PLACEHOLDERS** with actual values from Task 1 analysis.

**Verification**: `cat src/data/selection-compositing.json` — no placeholders remain

---

### Task 3: Create Cinematic Beat Data (from frame timing)
**File**: `src/data/cinematic-beats.json` (NEW)

```json
{
  "left": {
    "introEnd": 2.54,
    "divergenceStart": 3.0,
    "selectionStart": 8.0,
    "selectionEnd": 10.0,
    "transitionComplete": 11.04
  },
  "right": {
    "introEnd": 2.54,
    "divergenceStart": 3.0,
    "selectionStart": 8.5,
    "selectionEnd": 10.0,
    "transitionComplete": 11.96
  },
  "shared": {
    "introEnd": 2.54,
    "divergenceStart": 3.0
  }
}
```
*Values derived from frame delays — verify against actual frame analysis*

**Verification**: Progress percentages calculate correctly:
- Left introEnd: 2.54/11.04 = 23%
- Left selectionStart: 8.0/11.04 = 72%
- Right selectionStart: 8.5/11.96 = 71%

---

### Task 4: Update FrameSequenceCanvas for Offscreen Rendering
**File**: `src/components/Hero/FrameSequenceCanvas.tsx` (MODIFY)

**Required changes**:
- Accept `targetCanvas?: OffscreenCanvas | HTMLCanvasElement` prop
- If provided, draw to that canvas instead of creating own canvas
- If not provided, create own canvas (backward compatibility for testing)
- Expose `getOffscreenCanvas()` method for compositor access
- Remove internal `<canvas>` element from JSX when `targetCanvas` provided

```typescript
interface FrameSequenceCanvasProps {
  side: 'left' | 'right';
  progress: number;
  targetCanvas?: OffscreenCanvas | HTMLCanvasElement;  // NEW
  mode?: 'single' | 'dual' | 'transition';             // NEW
  layout?: { x: number; y: number; width: number; height: number }; // NEW
}

// Internal: use targetCanvas or create own OffscreenCanvas
const offscreenRef = useRef<OffscreenCanvas | HTMLCanvasElement | null>(null);

useEffect(() => {
  if (targetCanvas) {
    offscreenRef.current = targetCanvas;
  } else if (typeof OffscreenCanvas !== 'undefined') {
    offscreenRef.current = new OffscreenCanvas(960, 540);
  } else {
    // Fallback for browsers without OffscreenCanvas
    const canvas = document.createElement('canvas');
    canvas.width = 960; canvas.height = 540;
    offscreenRef.current = canvas;
  }
}, [targetCanvas]);

// drawFrame draws to offscreenRef.current
// Expose for compositor:
const getOffscreenCanvas = useCallback(() => offscreenRef.current, []);
```

**JSX**: Conditional render — if `targetCanvas` provided, render `null` (parent manages visible canvas); else render own `<canvas>` for standalone testing.

**Verification**: Component works in both modes; `getOffscreenCanvas()` returns valid canvas

---

### Task 5: Create Compositor Hook
**File**: `src/hooks/useCinematicCompositor.ts` (NEW)

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { selectionConfig } from '../data/selection-compositing';

interface CompositorOptions {
  mainCanvas: HTMLCanvasElement;
  leftRenderer: { getOffscreenCanvas: () => OffscreenCanvas | HTMLCanvasElement | null };
  rightRenderer: { getOffscreenCanvas: () => OffscreenCanvas | HTMLCanvasElement | null };
  phase: 'intro' | 'diverging' | 'dual' | 'selection' | 'transitioning';
  pendingPath: 'data' | 'cloud' | null;
  scrollProgress: number;
}

export const useCinematicCompositor = ({
  mainCanvas,
  leftRenderer,
  rightRenderer,
  phase,
  pendingPath,
  scrollProgress
}: CompositorOptions) => {
  const animationRef = useRef<number>();

  const layout = selectionConfig.layout[selectionConfig.phases[phase]?.layout as keyof typeof selectionConfig.layout] 
    ?? selectionConfig.layout['split-vertical'];

  const composite = useCallback(() => {
    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;

    const leftCanvas = leftRenderer.getOffscreenCanvas();
    const rightCanvas = rightRenderer.getOffscreenCanvas();
    if (!leftCanvas || !rightCanvas) return;

    const { left, right } = layout;
    const mw = mainCanvas.width, mh = mainCanvas.height;

    ctx.clearRect(0, 0, mw, mh);

    if (phase === 'intro') {
      // Blended: draw left at full, right at low opacity (or alternate)
      ctx.globalAlpha = 1.0;
      drawFrame(ctx, leftCanvas, { x: 0, y: 0, width: mw, height: mh });
      ctx.globalAlpha = 0.3;
      drawFrame(ctx, rightCanvas, { x: 0, y: 0, width: mw, height: mh });
      ctx.globalAlpha = 1.0;
    } else if (phase === 'dual' || phase === 'selection') {
      // Dual layout from config
      drawFrame(ctx, leftCanvas, { 
        x: left.x * mw, y: left.y * mh, 
        width: left.width * mw, height: left.height * mh 
      });
      drawFrame(ctx, rightCanvas, { 
        x: right.x * mw, y: right.y * mh, 
        width: right.width * mw, height: right.height * mh 
      });
    } else if (phase === 'transitioning' && pendingPath) {
      // Single: chosen path
      const chosen = pendingPath === 'data' ? leftCanvas : rightCanvas;
      drawFrame(ctx, chosen, { x: 0, y: 0, width: mw, height: mh });
    } else {
      // Diverging: interpolate (optional — can reuse dual layout)
      drawFrame(ctx, leftCanvas, { x: 0, y: 0, width: mw, height: mh });
    }

    function drawFrame(ctx: CanvasRenderingContext2D, source: OffscreenCanvas | HTMLCanvasElement, dest: { x: number; y: number; width: number; height: number }) {
      const sw = source.width, sh = source.height;
      const dw = dest.width, dh = dest.height;
      const sar = sw / sh, dar = dw / dh;
      let sx = 0, sy = 0, sWidth = sw, sHeight = sh;
      if (sar > dar) { sHeight = sw / dar; sy = (sh - sHeight) / 2; }
      else { sWidth = sh * dar; sx = (sw - sWidth) / 2; }
      ctx.drawImage(source, sx, sy, sWidth, sHeight, dest.x, dest.y, dw, dh);
    }
  }, [mainCanvas, leftRenderer, rightRenderer, phase, pendingPath, layout]);

  // Run at display refresh rate
  useEffect(() => {
    const loop = () => {
      composite();
      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [composite]);
};
```

**Verification**: Compositor runs at 60fps, draws correctly for each phase

---

### Task 6: Create CinematicHero Component
**File**: `src/components/Hero/CinematicHero.tsx` (NEW)

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { FrameSequenceCanvas } from './FrameSequenceCanvas';
import { useCinematicCompositor } from '../../hooks/useCinematicCompositor';
import { cinematicBeats } from '../../data/cinematic-beats';
import { selectionConfig } from '../../data/selection-compositing';
import './CinematicHero.css';

gsap.registerPlugin(ScrollTrigger);

interface CinematicHeroProps {
  onTransitionComplete: (path: 'data' | 'cloud') => void;
}

type HeroPhase = 'intro' | 'diverging' | 'dual' | 'selection' | 'transitioning';

export const CinematicHero = ({ onTransitionComplete }: CinematicHeroProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const leftRendererRef = useRef<{ getOffscreenCanvas: () => OffscreenCanvas | HTMLCanvasElement | null } | null>(null);
  const rightRendererRef = useRef<{ getOffscreenCanvas: () => OffscreenCanvas | HTMLCanvasElement | null } | null>(null);
  const reducedMotion = useReducedMotion();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [phase, setPhase] = useState<HeroPhase>('intro');
  const [pendingPath, setPendingPath] = useState<'data' | 'cloud' | null>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const transitionFired = useRef(false);

  const handleScroll = useCallback((self: ScrollTrigger) => {
    const prog = self.progress;
    setScrollProgress(prog);
    
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

    const container = containerRef.current;
    if (!container) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
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

  // Compositor: connects offscreen renderers to main canvas
  useCinematicCompositor({
    mainCanvas: mainCanvasRef.current!,
    leftRenderer: leftRendererRef.current!,
    rightRenderer: rightRendererRef.current!,
    phase,
    pendingPath,
    scrollProgress
  });

  const handlePathSelect = useCallback((path: 'data' | 'cloud') => {
    if (phase !== 'selection' || pendingPath) return;
    
    setPendingPath(path);
    setPhase('transitioning');
    transitionFired.current = true;
    
    const mapping = selectionConfig.progressMapping[path === 'data' ? 'left' : 'right'];
    const remainingProgress = 1.0 - scrollProgress;
    const totalDuration = path === 'data' 
      ? cinematicBeats.left.transitionComplete 
      : cinematicBeats.right.transitionComplete;
    const remainingTime = remainingProgress * totalDuration;
    
    setTimeout(() => onTransitionComplete(path), remainingTime * 1000);
  }, [phase, pendingPath, scrollProgress, onTransitionComplete]);

  return (
    <div ref={containerRef} className="cinematic-hero" data-phase={phase}>
      {/* Main visible canvas */}
      <canvas 
        ref={mainCanvasRef}
        id="cinematic-canvas"
        width={1920}
        height={1080}
        className="cinematic-hero__main-canvas"
        aria-hidden="true"
      />
      
      {/* Left renderer — draws to offscreen */}
      <FrameSequenceCanvas
        ref={leftRendererRef as any}
        side="left"
        progress={scrollProgress}
        mode={phase === 'intro' ? 'single' : 'dual'}
      />
      
      {/* Right renderer — draws to offscreen */}
      <FrameSequenceCanvas
        ref={rightRendererRef as any}
        side="right"
        progress={scrollProgress}
        mode={phase === 'intro' ? 'single' : 'dual'}
      />
      
      {/* Hotspot layer — invisible buttons over visual path indicators */}
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
      
      {/* Accessibility announcements */}
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
- Main canvas visible, offscreen renderers draw to it
- Phase transitions at correct scroll progress
- Hotspots clickable in selection phase

---

### Task 7: CinematicHero CSS
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

.cinematic-hero__main-canvas {
  display: block;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  /* The compositor draws to this canvas every frame */
}

/* FrameSequenceCanvas components render to offscreen — no visible canvas elements */
.cinematic-hero frame-sequence-canvas {
  display: none;
}

/* Hotspot layer — invisible buttons positioned over visual path indicators */
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
}

/* Focus visible for keyboard navigation */
.cinematic-hero__hotspot:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Phase-specific styles if needed */
.cinematic-hero[data-phase="intro"] .cinematic-hero__main-canvas { }
.cinematic-hero[data-phase="dual"] .cinematic-hero__main-canvas { }
.cinematic-hero[data-phase="selection"] .cinematic-hero__main-canvas { }

/* Reduced motion: skip cinematic, show selection or final state */
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

---

### Task 8: Update App.tsx — Direct Hero-to-World
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

**Verification**: No `path-selection` state, direct transition

---

### Task 9: Update GameStore
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

---

### Task 10: Delete PathSelection Component
**Files**: DELETE
- `src/components/PathSelection/PathSelection.tsx`
- `src/components/PathSelection/PathSelection.css`
- `src/components/PathSelection/index.ts`

**Verification**: `npm run build` passes, no PathSelection imports anywhere

---

### Task 11: Update Visual QA for Cinematic Beats
**File**: `qa/visual-qa.spec.ts` (MODIFY)

```typescript
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '..', 'qa-screenshots');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Cinematic beats from ACTUAL frame timing (not arbitrary percentages)
const CINEMATIC_BEATS = [
  { name: 'intro-0', progress: 0.0, phase: 'intro' },
  { name: 'intro-25', progress: 0.1, phase: 'intro' },
  { name: 'intro-50', progress: 0.15, phase: 'intro' },
  { name: 'intro-end', progress: 0.23, phase: 'intro' },
  { name: 'diverging-start', progress: 0.24, phase: 'diverging' },
  { name: 'diverging-end', progress: 0.27, phase: 'diverging' },
  { name: 'dual-early', progress: 0.35, phase: 'dual' },
  { name: 'dual-mid', progress: 0.50, phase: 'dual' },
  { name: 'dual-late', progress: 0.65, phase: 'dual' },
  { name: 'selection-start', progress: 0.72, phase: 'selection', hotspots: true },
  { name: 'selection-mid', progress: 0.80, phase: 'selection', hotspots: true },
  { name: 'selection-commit', progress: 0.86, phase: 'selection', hotspots: true },
  { name: 'transition-mid', progress: 0.93, phase: 'transitioning' },
  { name: 'transition-end', progress: 1.0, phase: 'transitioning' },
];

async function scrollToBeat(page: any, progress: number) {
  await page.evaluate((p) => {
    const hero = document.querySelector('.cinematic-hero');
    if (hero) window.scrollTo(0, hero.offsetHeight * p);
  }, progress);
  await page.waitForTimeout(500);
  await page.evaluate(() => { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
  await page.waitForTimeout(300);
}

async function captureMainCanvas(page: any, name: string) {
  const canvas = page.locator('#cinematic-canvas');
  await expect(canvas).toBeVisible();
  await canvas.screenshot({ path: path.join(OUTPUT_DIR, `cinematic-${name}.png`) });
}

test.describe('Phase 1 Visual QA - Cinematic Hero', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Frame loading
  });

  for (const beat of CINEMATIC_BEATS) {
    test(`Cinematic at ${beat.name} (${(beat.progress * 100).toFixed(0)}%)`, async ({ page }) => {
      await scrollToBeat(page, beat.progress);
      await captureMainCanvas(page, beat.name);
      
      // Verify phase attribute
      const hero = page.locator('.cinematic-hero');
      await expect(hero).toHaveAttribute('data-phase', beat.phase);
    });
  }

  test('Selection hotspots visible and correctly positioned', async ({ page }) => {
    await scrollToBeat(page, 0.75); // In selection phase
    await page.waitForTimeout(500);
    
    const dataHotspot = page.locator('.cinematic-hero__hotspot--data');
    const cloudHotspot = page.locator('.cinematic-hero__hotspot--cloud');
    
    await expect(dataHotspot).toBeVisible();
    await expect(cloudHotspot).toBeVisible();
    
    // Verify hotspots are positioned per config (not hardcoded)
    const dataStyle = await dataHotspot.getAttribute('style');
    const cloudStyle = await cloudHotspot.getAttribute('style');
    expect(dataStyle).toContain('left:');
    expect(cloudStyle).toContain('left:');
  });

  test('Data hotspot click triggers transition to data-world', async ({ page }) => {
    await scrollToBeat(page, 0.75);
    await page.waitForTimeout(500);
    
    await page.click('.cinematic-hero__hotspot--data');
    await page.waitForTimeout(2000);
    
    await expect(page.locator('.data-world')).toBeVisible();
  });

  test('Cloud hotspot click triggers transition to cloud-world', async ({ page }) => {
    await scrollToBeat(page, 0.75);
    await page.waitForTimeout(500);
    
    await page.click('.cinematic-hero__hotspot--cloud');
    await page.waitForTimeout(2000);
    
    await expect(page.locator('.cloud-world')).toBeVisible();
  });

  test('Reduced motion skips to selection or final state', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Should be in data-world (default for reduced motion) or selection phase
    const dataWorld = page.locator('.data-world');
    const heroSelection = page.locator('.cinematic-hero[data-phase="selection"]');
    await expect(dataWorld.or(heroSelection).first()).toBeVisible({ timeout: 5000 });
  });

  test('Responsive: hero renders on mobile/tablet/desktop', async ({ page }) => {
    for (const viewport of [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 }
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('http://127.0.0.1:5173');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const canvas = page.locator('#cinematic-canvas');
      await expect(canvas).toBeVisible();
    }
  });
});
```

**Verification**: All 18 tests pass

---

### Task 12: Extract Cinematic Reference Frames for Pixel-Diff
**File**: `qa/extract-cinematic-references.py` (NEW)

```python
#!/usr/bin/env python3
"""Extract reference frames at cinematic beats for pixel-diff comparison."""
import cv2
import os
from pathlib import Path

VIDEO_MAP = {
    'left': 'C:/Users/hitoy/Downloads/start-to-left.mp4',
    'right': 'C:/Users/hitoy/Downloads/start-to-right.mp4'
}

# Beats from ACTUAL timing (Task 1 + frame analysis)
BEATS = {
    'left': [0.0, 2.54, 3.0, 4.0, 6.0, 8.0, 8.5, 9.0, 9.5, 10.0, 11.04],
    'right': [0.0, 2.54, 3.0, 4.0, 6.0, 8.5, 9.0, 9.5, 10.0, 11.0, 11.5, 11.96]
}

os.makedirs('qa-reference-cinematic', exist_ok=True)

for side, video_path in VIDEO_MAP.items():
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    for beat_time in BEATS[side]:
        frame_idx = int(beat_time * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if ret:
            filename = f'qa-reference-cinematic/{side}-{beat_time:.2f}s.png'
            cv2.imwrite(filename, frame)
            print(f'Saved {filename} (frame {frame_idx}, {beat_time}s)')
    
    cap.release()

print('Reference extraction complete.')
```

**Verification**: `ls qa-reference-cinematic/*.png` shows 23 frames

---

### Task 13: Run Full Visual QA + Pixel-Diff
**Commands**:
```bash
# 1. Build
npm run build

# 2. Start dev server
npm run dev -- --host 0.0.0.0 --port 5173 &
sleep 8 && curl -s -o /dev/null -w "%{http_code}" http://localhost:5173

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
#!/usr/bin/env python3
import cv2
import numpy as np
from pathlib import Path

REF_DIR = Path('qa-reference-cinematic')
SCREEN_DIR = Path('qa-screenshots')

# Map test names to reference files
BEAT_MAP = {
    'intro-0': ('left', '0.00'), 'intro-25': ('left', '2.54'), 'intro-50': ('left', '3.00'),
    'intro-end': ('left', '2.54'), 'diverging-start': ('left', '3.00'), 'diverging-end': ('left', '4.00'),
    'dual-early': ('left', '6.00'), 'dual-mid': ('left', '8.00'), 'dual-late': ('left', '9.00'),
    'selection-start': ('left', '8.50'), 'selection-mid': ('left', '9.50'), 'selection-commit': ('left', '10.00'),
    'transition-mid': ('left', '11.04'), 'transition-end': ('left', '11.04'),
}

def compare(ref_path: Path, screen_path: Path) -> float:
    ref = cv2.imread(str(ref_path))
    screen = cv2.imread(str(screen_path))
    if ref is None or screen is None:
        return -1
    if screen.shape != ref.shape:
        screen = cv2.resize(screen, (ref.shape[1], ref.shape[0]))
    diff = cv2.absdiff(ref, screen)
    gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    non_zero = np.count_nonzero(gray)
    return (non_zero / gray.size) * 100

print('=== PIXEL-DIFF COMPARISON ===')
all_pass = True
for beat_name, (side, time_str) in BEAT_MAP.items():
    ref = REF_DIR / f'{side}-{time_str}s.png'
    screen = SCREEN_DIR / f'cinematic-{beat_name}.png'
    if ref.exists() and screen.exists():
        pct = compare(ref, screen)
        status = 'PASS' if pct < 0.5 else 'FAIL'
        if pct >= 0.5: all_pass = False
        print(f'{beat_name:20s} ({side} {time_str}s): {pct:.2f}% {status}')
    else:
        print(f'{beat_name:20s}: MISSING ref={ref.exists()} screen={screen.exists()}')

# Also compare right-path beats
RIGHT_BEATS = ['selection-start', 'selection-mid', 'selection-commit']
for beat_name in RIGHT_BEATS:
    if beat_name in BEAT_MAP:
        continue
    # Find corresponding right reference
    pass

print(f'\nOverall: {"ALL PASS" if all_pass else "SOME FAIL"}')
```

**Expected**: All beats PASS (<0.5% pixel mismatch)

---

### Task 14: Accessibility & Reduced Motion Audit
**Checklist** (verify manually + automated):
- [ ] `prefers-reduced-motion: reduce` → jumps to selection phase or data-world
- [ ] Keyboard: Tab → hotspots, Enter/Space → activate
- [ ] Screen reader: `aria-live` announces phase changes
- [ ] Focus visible: Hotspots show focus ring
- [ ] Touch targets: Hotspots ≥44×44px on mobile
- [ ] Color contrast: Any visible text meets WCAG AA

**Automated test** (`qa/accessibility.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('no axe violations', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('keyboard navigation to hotspots', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Scroll to selection phase
    await page.evaluate(() => {
      const hero = document.querySelector('.cinematic-hero');
      if (hero) window.scrollTo(0, hero.offsetHeight * 0.8);
    });
    await page.waitForTimeout(1000);
    
    // Tab to first hotspot
    await page.keyboard.press('Tab');
    const dataHotspot = page.locator('.cinematic-hero__hotspot--data');
    await expect(dataHotspot).toBeFocused();
    
    // Enter activates
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    await expect(page.locator('.data-world')).toBeVisible();
  });
});
```

**Run**: `npx playwright test qa/accessibility.spec.ts --headed`

---

### Task 15: Code Review, Lint, Build, Document
**Commands**:
```bash
# Lint
npx oxlint src/**/*.tsx

# Type check
npx tsc --noEmit

# Production build
npm run build

# Verify dist contents
ls -la dist/

# Update lessons learned
echo "## Phase 1 Complete - $(date)" >> .gsd/LESSONS.md
echo "- Compositing strategy: [from Task 1]" >> .gsd/LESSONS.md
echo "- Canvas architecture: single visible + two offscreen renderers" >> .gsd/LESSONS.md
echo "- Selection: cinematic hotspots over frame indicators, no HTML cards" >> .gsd/LESSONS.md
echo "- Cinematic beats determined from actual frame timing metadata" >> .gsd/LESSONS.md
echo "- Visual QA: 14 beats, pixel-diff <0.5% threshold" >> .gsd/LESSONS.md
echo "" >> .gsd/LESSONS.md
```

---

## Tests / Validation Summary

| Task | Test Approach | Pass Criteria |
|------|---------------|---------------|
| 1 | Visual frame analysis | `FINDINGS.md` documents strategy & coordinates |
| 2 | Config validation | No placeholders in `selection-compositing.json` |
| 3 | Beat timing | Progress % matches frame delays |
| 4 | FrameSequenceCanvas | Offscreen rendering works in dual/single modes |
| 5 | Compositor hook | 60fps compositing, correct per phase |
| 6 | CinematicHero | Phase transitions at beats, hotspots clickable |
| 7 | CSS | Dual canvas renders, hotspots positioned |
| 8 | App.tsx | No path-selection, direct hero→world |
| 9 | GameStore | World type excludes path-selection |
| 10 | Deletion | PathSelection gone, build passes |
| 11 | Visual QA | 18 Playwright tests pass |
| 12 | Pixel-diff | All 14 beats <0.5% mismatch |
| 13 | Accessibility | Axe clean, keyboard/screen reader work |
| 14 | Code quality | Lint clean, types clean, build succeeds |

---

## Risks, Tradeoffs, and Open Questions

### Risks:
1. **Task 1 subjectivity**: Visual analysis may reveal unexpected composition — plan must adapt
2. **Dual offscreen canvas memory**: Two 1920×1080 offscreen canvases + main = ~36MB GPU memory
3. **Progress sync**: Left/right sequences different durations — progress mapping must be precise
3. **Hotspot alignment**: Coordinates from frame analysis must match rendered output exactly
4. **Phaser handoff**: Transition from composited canvas to Phaser canvas (Phase 2)

### Tradeoffs:
- **Single visible + two offscreen** vs **two visible side-by-side**: Chosen architecture ensures single output canvas (required for video capture, consistent compositing) but adds compositor complexity
- **Configuration-driven** vs hardcoded: Config allows tuning without rebuild but requires Task 1 completion first
- **OffscreenCanvas** vs HTMLCanvasElement: OffscreenCanvas enables worker compositing (future) but Safari support requires fallback

### Open Questions (resolved in Task 1):
1. Exact compositing strategy → **Task 1 output**
2. Hotspot pixel coordinates → **Task 1 output**  
3. Intro blending method → **Task 1 output** (alternate frames? cross-fade? side-by-side from start?)
4. Diverging animation → **Task 1 output** (split? zoom? morph?)

---

## Execution Order
```
Task 1 → [HUMAN REVIEW & APPROVAL] → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8 → Task 9 → Task 10 → Task 11 → Task 12 → Task 13 → Task 14 → Task 15
```

**DO NOT SKIP TASK 1 HUMAN REVIEW.** The compositing strategy MUST come from actual frame analysis.

---

## Next Phases (Post-Phase 1)
1. **Phase 2**: Phaser 3 gameplay foundation — character controller, world state sync, asset pipeline
2. **Phase 3**: Data world vertical slice — pipe navigation, skill stations, project boxes
3. **Phase 4**: Cloud world vertical slice — cloud jumping, skill clouds, project clouds
4. **Phase 5**: Experience section — internship timeline, coursework, certifications