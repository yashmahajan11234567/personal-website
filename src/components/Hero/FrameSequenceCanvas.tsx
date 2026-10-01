import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef, useState } from 'react';

interface FrameSequenceCanvasProps {
  side: 'left' | 'right';
  progress: number;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  crossfade?: number; // 0 = left only, 1 = right only, 0-1 = crossfade (only used during diverging phase)
}

interface FrameSequenceCanvasRef {
  getCurrentFrame: () => number;
  getTotalFrames: () => number;
  getTotalDuration: () => number;
}

const FRAME_BASE_PATH = '/frames';

export const FrameSequenceCanvas = forwardRef<FrameSequenceCanvasRef, FrameSequenceCanvasProps>(({ side, progress, canvasRef: externalCanvasRef, crossfade = 0 }, ref) => {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<Map<string, HTMLImageElement>>(new Map()); // key: "left:0", "right:0"
  const delaysRef = useRef<{ left: number[], right: number[] }>({ left: [], right: [] });
  const totalFramesRef = useRef({ left: 0, right: 0 });
  const totalDurationRef = useRef({ left: 0, right: 0 });
  const [delaysLoaded, setDelaysLoaded] = useState({ left: false, right: false });
  const [initialFramesLoaded, setInitialFramesLoaded] = useState({ left: false, right: false });
  const [frameUpdateCounter, setFrameUpdateCounter] = useState(0);
  const timeOffsetsRef = useRef({ left: 0, right: 0 }); // Time to skip before visible content starts
  const visibleDurationsRef = useRef({ left: 0, right: 0 }); // Duration of visible content

  // Use external canvas if provided, otherwise use internal
  const canvasRef = externalCanvasRef ?? internalCanvasRef;

  // Expose imperative API for parent component
  useImperativeHandle(ref, () => ({
    getCurrentFrame: () => {
      const delays = delaysRef.current[side];
      if (delays.length === 0) return 0;
      const adjustedTime = timeOffsetsRef.current[side] + progress * visibleDurationsRef.current[side];
      const targetTime = Math.min(adjustedTime, totalDurationRef.current[side]); // Clamp to total duration
      let accumulated = 0;
      for (let i = 0; i < delays.length; i++) {
        accumulated += delays[i];
        if (accumulated >= targetTime) return i;
      }
      return delays.length - 1;
    },
    getTotalFrames: () => totalFramesRef.current.left + totalFramesRef.current.right,
    getTotalDuration: () => totalDurationRef.current.left + totalDurationRef.current.right,
  }));

  // DEBUG: Log component body execution
  console.log(`[FrameSequenceCanvas] Component body executing. delaysLoaded: ${JSON.stringify(delaysLoaded)}`);

  // Load delays JSON for both sides
  useEffect(() => {
    const loadDelays = async (s: 'left' | 'right') => {
      console.log(`[FrameSequenceCanvas] Loading delays for side: ${s}`);
      try {
        const response = await fetch(`/data/${s}Delays.json`);
        const d: number[] = await response.json();
        console.log(`[FrameSequenceCanvas] Loaded ${d.length} delays for ${s}`);
        delaysRef.current[s] = d;
        totalFramesRef.current[s] = d.length;
        totalDurationRef.current[s] = d.reduce((acc: number, cur: number) => acc + cur, 0);
        
        // Calculate time offset to skip initial black frames
        // Based on our analysis:
        // Left: frame 8 is first with brightness > 30 (time offset = 0.333s)
        // Right: frame 2 is first with brightness > 30 (time offset = 0.08s)
        let timeOffset = 0;
        if (s === 'left') {
          // Sum delays[0] to delays[7] to get time offset for left side
          for (let i = 0; i < 8 && i < d.length; i++) {
            timeOffset += d[i];
          }
        } else if (s === 'right') {
          // Sum delays[0] to delays[1] to get time offset for right side
          for (let i = 0; i < 2 && i < d.length; i++) {
            timeOffset += d[i];
          }
        }
        
        timeOffsetsRef.current[s] = timeOffset;
        visibleDurationsRef.current[s] = totalDurationRef.current[s] - timeOffset;
        console.log(`[FrameSequenceCanvas] Side ${s}: time offset = ${timeOffset}s, visible duration = ${visibleDurationsRef.current[s]}s`);
        
        // Update state to trigger re-render when delays are loaded
        console.log(`[FrameSequenceCanvas] Setting delaysLoaded[${s}] = true`);
        setDelaysLoaded(prev => ({ ...prev, [s]: true }));
      } catch (err) {
        console.error(`[FrameSequenceCanvas] Failed to load delays for ${s}:`, err);
      }
    };
    loadDelays('left');
    loadDelays('right');
  }, []);

  // Calculate which frame index corresponds to current progress
  const getFrameIndex = useCallback((s: 'left' | 'right', prog: number): number => {
    const delays = delaysRef.current[s];
    if (delays.length === 0) return 0;
    const adjustedTime = timeOffsetsRef.current[s] + prog * visibleDurationsRef.current[s];
    const targetTime = Math.min(adjustedTime, totalDurationRef.current[s]); // Clamp to total duration
    let accumulated = 0;
    for (let i = 0; i < delays.length; i++) {
      accumulated += delays[i];
      if (accumulated >= targetTime) return i;
    }
    return delays.length - 1;
  }, [timeOffsetsRef, visibleDurationsRef, totalDurationRef]);

  // Draw frame to canvas
  const drawFrame = useCallback((frame: HTMLImageElement, opacity: number = 1) => {
    console.log(`[FrameSequenceCanvas] drawFrame called: frame=${frame.width}x${frame.height}, opacity=${opacity}`);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const canvasAR = canvas.width / canvas.height;
    const frameAR = frame.width / frame.height;
    let drawW, drawH, offsetX, offsetY;
    if (frameAR > canvasAR) {
      drawW = canvas.width;
      drawH = canvas.width / frameAR;
      offsetX = 0;
      offsetY = (canvas.height - drawH) / 2;
    } else {
      drawH = canvas.height;
      drawW = canvas.height * frameAR;
      offsetX = (canvas.width - drawW) / 2;
      offsetY = 0;
    }
    ctx.globalAlpha = opacity;
        ctx.drawImage(frame, offsetX, offsetY, drawW, drawH);
        ctx.globalAlpha = 1;
        console.log(`[FrameSequenceCanvas] Drew frame ${frame.width}x${frame.height} to canvas ${canvas.width}x${canvas.height} with opacity ${opacity}`);
      }, []);

      // Load a specific frame for a specific side
  const loadFrame = useCallback(async (s: 'left' | 'right', index: number): Promise<HTMLImageElement | null> => {
    if (!delaysLoaded[s]) {
      console.log(`[FrameSequenceCanvas] loadFrame: delaysLoaded[${s}] is false, skipping frame ${index}`);
      return null;
    }
    const key = `${s}:${index}`;
    if (framesRef.current.has(key)) {
      console.log(`[FrameSequenceCanvas] Frame ${key} already cached`);
      return framesRef.current.get(key)!;
    }
    const delays = delaysRef.current[s];
    if (index >= delays.length) {
      console.log(`[FrameSequenceCanvas] Frame index ${index} out of bounds for ${s} (max: ${delays.length - 1})`);
      return null;
    }
    const delay = delays[index];
    const frameNum = String(index).padStart(3, '0');
    const delayStr = delay.toString();
    const filename = `frame_${frameNum}_delay-${delayStr}s.webp`;
    const url = `${FRAME_BASE_PATH}/${s} side/${filename}`;
    console.log(`[FrameSequenceCanvas] Loading frame URL: ${url}`);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        console.log(`[FrameSequenceCanvas] Successfully loaded frame ${key} (${img.width}x${img.height})`);
        framesRef.current.set(key, img);
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`[FrameSequenceCanvas] Failed to load frame ${key} for ${s}`);
        resolve(null);
      };
      img.src = url;
    });
  }, [delaysLoaded]);

  // Preload initial frames for both sides
  useEffect(() => {
    console.log(`[FrameSequenceCanvas] Preload effect running. delaysLoaded=${JSON.stringify(delaysLoaded)}`);
    if (!delaysLoaded.left || !delaysLoaded.right) {
      console.log(`[FrameSequenceCanvas] Preload effect: skipping because delaysLoaded is false`);
      return;
    }
    console.log(`[FrameSequenceCanvas] Preload effect: starting loadInitial`);
    const loadInitial = async () => {
      for (const s of ['left', 'right'] as const) {
        const delays = delaysRef.current[s];
        const initialFrames = Math.min(10, delays.length);
        console.log(`[FrameSequenceCanvas] Preload: loading ${initialFrames} frames for ${s}`);
        for (let i = 0; i < initialFrames; i++) {
          await loadFrame(s, i);
        }
      }
      console.log(`[FrameSequenceCanvas] Preload: loadInitial complete, setting initialFramesLoaded`);
      setInitialFramesLoaded(prev => ({ ...prev, left: true, right: true }));
    };
    loadInitial();
  }, [delaysLoaded, loadFrame]);

  // Update sliding window based on progress
  useEffect(() => {
    console.log(`[FrameSequenceCanvas] Sliding window effect running. progress=${progress}, delaysLoaded=${JSON.stringify(delaysLoaded)}`);
    if (!delaysLoaded.left || !delaysLoaded.right) return;

    let mounted = true;
    const windowSize = 15;

    const loadWindowFrames = async () => {
      const currentFrameLeft = getFrameIndex('left', progress);
      const currentFrameRight = getFrameIndex('right', progress);

      for (const s of ['left', 'right'] as const) {
        const currentFrame = s === 'left' ? currentFrameLeft : currentFrameRight;
        const newStart = Math.max(0, currentFrame - windowSize);
        const newEnd = Math.min(delaysRef.current[s].length - 1, currentFrame + windowSize);

        for (let i = newStart; i <= newEnd; i++) {
          await loadFrame(s, i);
        }

        // LRU eviction
        if (framesRef.current.size > 80) {
          const framesToKeep = new Set();
          for (let i = newStart; i <= newEnd; i++) framesToKeep.add(`${s}:${i}`);
          framesToKeep.add(`${s}:0`);
          framesToKeep.add(`${s}:${delaysRef.current[s].length - 1}`);

          for (const [key] of framesRef.current) {
            if (!framesToKeep.has(key)) {
              framesRef.current.delete(key);
            }
          }
        }
      }

      if (mounted) {
        console.log(`[FrameSequenceCanvas] Sliding window complete, incrementing frameUpdateCounter`);
        setFrameUpdateCounter(c => c + 1);
      }
    };

    loadWindowFrames();

    return () => {
      mounted = false;
    };
  }, [progress, getFrameIndex, loadFrame, delaysLoaded]);

  // Render current frame(s) with crossfade
  useEffect(() => {
    let mounted = true;

    const renderFrames = async () => {
          if (!mounted) return;
          console.log(`[FrameSequenceCanvas] Render effect called. progress=${progress}, crossfade=${crossfade}, side=${side}, delaysLoaded=${JSON.stringify(delaysLoaded)}, initialFramesLoaded=${JSON.stringify(initialFramesLoaded)}`);
          if (!delaysLoaded.left || !delaysLoaded.right) {
            console.log(`[FrameSequenceCanvas] Delays not loaded yet, returning early.`);
            return;
          }
          if (!initialFramesLoaded.left || !initialFramesLoaded.right) {
            console.log(`[FrameSequenceCanvas] Initial frames not loaded yet, returning early.`);
            return;
          }

          const canvas = canvasRef.current;
          if (!canvas) {
            console.log(`[FrameSequenceCanvas] Canvas ref is null, returning early.`);
            return;
          }
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.log(`[FrameSequenceCanvas] Canvas context is null, returning early.`);
            return;
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Preload frames for current progress before rendering
          const windowSize = 15;
          for (const s of ['left', 'right'] as const) {
            const currentFrame = getFrameIndex(s, progress);
            const newStart = Math.max(0, currentFrame - windowSize);
            const newEnd = Math.min(delaysRef.current[s].length - 1, currentFrame + windowSize);
            for (let i = newStart; i <= newEnd; i++) {
              await loadFrame(s, i);
            }
          }

          if (!mounted) return;

                    // During crossfade (0 < crossfade < 1), draw both frames
                    if (crossfade > 0 && crossfade < 1) {
            const leftFrameIndex = getFrameIndex('left', progress);
            const rightFrameIndex = getFrameIndex('right', progress);
            const leftFrame = framesRef.current.get(`left:${leftFrameIndex}`);
            const rightFrame = framesRef.current.get(`right:${rightFrameIndex}`);
            const leftOpacity = 1 - crossfade;
            const rightOpacity = crossfade;
            if (leftFrame) drawFrame(leftFrame, leftOpacity);
            if (rightFrame) drawFrame(rightFrame, rightOpacity);
            console.log(`[FrameSequenceCanvas] Crossfade: left=${leftOpacity.toFixed(2)}, right=${rightOpacity.toFixed(2)}`);
          } else {
            // Normal single sequence rendering - use the side prop
            const frameIndex = getFrameIndex(side, progress);
            console.log(`[FrameSequenceCanvas] Render: side=${side}, frameIndex=${frameIndex}`);

            // Wait for frame to load if not already loaded
            let attempts = 0;
            let frame = framesRef.current.get(`${side}:${frameIndex}`);
            while (!frame && attempts < 50) { // max ~5 seconds
              await new Promise(r => setTimeout(r, 100));
              frame = framesRef.current.get(`${side}:${frameIndex}`);
              attempts++;
            }

            if (!frame) {
              console.log(`[FrameSequenceCanvas] Timeout waiting for frame ${frameIndex}`);
              return;
            }

            if (!mounted) return;
            drawFrame(frame, 1);
          }
        };

    renderFrames();

    return () => {
      mounted = false;
    };
  }, [progress, crossfade, side, getFrameIndex, drawFrame, delaysLoaded, initialFramesLoaded, frameUpdateCounter]);

  // If external canvas is provided, don't render our own canvas element
  if (externalCanvasRef) {
    return null;
  }

  // Otherwise render our own canvas (for standalone usage)
  return (
    <canvas
      ref={internalCanvasRef}
      width={1920}
      height={1080}
      className="cinematic-canvas"
      aria-hidden="true"
    />
  );
});

export type { FrameSequenceCanvasRef };
export default FrameSequenceCanvas;