import { useEffect, useRef, useCallback } from 'react';

interface SelectionVideoProps {
  /** Current scroll progress (0-1) */
  progress: number;
  /** Whether we're in selection phase */
  isSelectionPhase: boolean;
  /** Called when user selects a path */
  onPathSelect: (path: 'data' | 'cloud') => void;
  /** Reduced motion preference */
  reducedMotion: boolean;
  /** Canvas/video container ref for hit testing */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const SELECTION_VIDEO_SRC = '/videos/selection-transition.mp4';
const SELECTION_START_TIME = 3.0; // seconds - frame 72
const SELECTION_END_TIME = 8.0; // seconds - frame 192

/**
 * SelectionVideo - Plays the authoritative selection transition video
 * during the selection phase, with interactive hit regions over the boards.
 * 
 * The video shows:
 * 0-3s: PERSONAL/PORTFOLIO transformation → boards entering
 * 3-8s: Hold state with both boards visible (selection state)
 * 
 * During selection phase (progress 0.72-0.86):
 * - Video plays from 0s to 3s
 * - Then pauses at 3s (frame 72) for user selection
 * - On path select: resumes from 3s to 8s for chosen path
 */
export const SelectionVideo = ({ 
  progress, 
  isSelectionPhase, 
  onPathSelect, 
  reducedMotion,
  containerRef 
}: SelectionVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hitRegionDataRef = useRef<HTMLDivElement>(null);
  const hasPlayedIntro = useRef(false);
  const isHolding = useRef(false);
  const selectedPathRef = useRef<'data' | 'cloud' | null>(null);

  // Board hit regions (normalized to video frame)
  const boardRegions = {
    data: { x: 0.15, y: 0.20, width: 0.30, height: 0.60 },
    cloud: { x: 0.55, y: 0.20, width: 0.30, height: 0.60 }
  };

  // Sync video time with scroll progress during selection phase
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isSelectionPhase) return;

    if (reducedMotion) {
      // In reduced motion: jump to selection hold frame
      video.currentTime = SELECTION_START_TIME;
      video.pause();
      return;
    }

    // Selection phase progress: 0.72 to 0.86 (14% range)
    const selectionStart = 0.72;
    const selectionEnd = 0.86;
    const selectionProgress = (progress - selectionStart) / (selectionEnd - selectionStart);
    const clampedProgress = Math.max(0, Math.min(1, selectionProgress));

    if (selectedPathRef.current) {
      // Path selected: play from 3s to 8s
      const targetTime = SELECTION_START_TIME + clampedProgress * (SELECTION_END_TIME - SELECTION_START_TIME);
      if (Math.abs(video.currentTime - targetTime) > 0.1) {
        video.currentTime = targetTime;
      }
      if (video.paused) video.play();
      return;
    }

    if (!hasPlayedIntro.current) {
      // First time in selection phase: play intro (0-3s)
      const targetTime = clampedProgress * SELECTION_START_TIME;
      if (Math.abs(video.currentTime - targetTime) > 0.1) {
        video.currentTime = targetTime;
      }
      if (video.paused) video.play();

      // Check if we've reached the hold point
      if (video.currentTime >= SELECTION_START_TIME - 0.1) {
        hasPlayedIntro.current = true;
        isHolding.current = true;
        video.pause();
      }
    } else if (isHolding.current && !selectedPathRef.current) {
      // Holding at selection state
      video.currentTime = SELECTION_START_TIME;
      video.pause();
    }
  }, [progress, isSelectionPhase, reducedMotion]);

  // Handle video ended - should only happen after path selection
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      if (selectedPathRef.current) {
        // Video completed for selected path
        console.log('[SelectionVideo] Selected path video complete');
      }
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, []);

  // Set up hit regions for board interaction
  useEffect(() => {
    const container = containerRef.current;
    const hitContainer = hitRegionDataRef.current;
    if (!container || !hitContainer) return;

    const updateHitRegions = () => {
      // Left board (Data)
      const dataRegion = boardRegions.data;
      const dataEl = hitContainer.querySelector('[data-board="data"]') as HTMLElement;
      if (dataEl) {
        dataEl.style.left = `${dataRegion.x * 100}%`;
        dataEl.style.top = `${dataRegion.y * 100}%`;
        dataEl.style.width = `${dataRegion.width * 100}%`;
        dataEl.style.height = `${dataRegion.height * 100}%`;
      }

      // Right board (Cloud)
      const cloudRegion = boardRegions.cloud;
      const cloudEl = hitContainer.querySelector('[data-board="cloud"]') as HTMLElement;
      if (cloudEl) {
        cloudEl.style.left = `${cloudRegion.x * 100}%`;
        cloudEl.style.top = `${cloudRegion.y * 100}%`;
        cloudEl.style.width = `${cloudRegion.width * 100}%`;
        cloudEl.style.height = `${cloudRegion.height * 100}%`;
      }
    };

    updateHitRegions();
    window.addEventListener('resize', updateHitRegions);
    return () => window.removeEventListener('resize', updateHitRegions);
  }, [containerRef]);

  const handleBoardClick = useCallback((path: 'data' | 'cloud') => {
    if (selectedPathRef.current) return;
    
    console.log(`[SelectionVideo] Board clicked: ${path}`);
    selectedPathRef.current = path;
    hasPlayedIntro.current = true;
    isHolding.current = false;
    onPathSelect(path);
  }, [onPathSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, path: 'data' | 'cloud') => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBoardClick(path);
    }
  }, [handleBoardClick]);

  // In reduced motion, show static frame at selection hold
  if (reducedMotion) {
    return (
      <div className="cinematic-hero__selection-video-wrapper" ref={containerRef}>
        <video
          ref={videoRef}
          src={SELECTION_VIDEO_SRC}
          muted
          playsInline
          preload="auto"
          className="cinematic-hero__selection-video"
          aria-hidden="true"
        />
        <div 
          ref={hitRegionDataRef}
          className="cinematic-hero__board-hit-regions"
          role="region"
          aria-label="Choose your path"
        >
          <button
            data-board="data"
            className="cinematic-hero__board-hit-region cinematic-hero__board-hit-region--data"
            onClick={() => handleBoardClick('data')}
            onKeyDown={(e) => handleKeyDown(e, 'data')}
            aria-label="Enter Data World"
            tabIndex={0}
          >
            <span className="cinematic-hero__board-hit-region__focus-ring" />
          </button>
          <button
            data-board="cloud"
            className="cinematic-hero__board-hit-region cinematic-hero__board-hit-region--cloud"
            onClick={() => handleBoardClick('cloud')}
            onKeyDown={(e) => handleKeyDown(e, 'cloud')}
            aria-label="Enter Cloud / DevOps World"
            tabIndex={0}
          >
            <span className="cinematic-hero__board-hit-region__focus-ring" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cinematic-hero__selection-video-wrapper" ref={containerRef}>
      <video
        ref={videoRef}
        src={SELECTION_VIDEO_SRC}
        muted
        playsInline
        preload="auto"
        className="cinematic-hero__selection-video"
        aria-hidden="true"
      />
      <div 
        ref={hitRegionDataRef}
        className="cinematic-hero__board-hit-regions"
        role="region"
        aria-label="Choose your path"
      >
        <button
          data-board="data"
          className="cinematic-hero__board-hit-region cinematic-hero__board-hit-region--data"
          onClick={() => handleBoardClick('data')}
          onKeyDown={(e) => handleKeyDown(e, 'data')}
          aria-label="Enter Data World"
          tabIndex={0}
        >
          <span className="cinematic-hero__board-hit-region__focus-ring" />
        </button>
        <button
          data-board="cloud"
          className="cinematic-hero__board-hit-region cinematic-hero__board-hit-region--cloud"
          onClick={() => handleBoardClick('cloud')}
          onKeyDown={(e) => handleKeyDown(e, 'cloud')}
          aria-label="Enter Cloud / DevOps World"
          tabIndex={0}
        >
          <span className="cinematic-hero__board-hit-region__focus-ring" />
        </button>
      </div>
    </div>
  );
};

export default SelectionVideo;