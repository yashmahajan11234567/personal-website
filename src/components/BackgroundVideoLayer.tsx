/**
 * BackgroundVideoLayer — React-managed video backgrounds for Data World chapters.
 *
 * Architecture: one controller per chapter, each owning a PAIR of <video>
 * elements that alternate as the visible ("active") player. A single
 * interval per active chapter triggers a 0.5 s crossfade whenever the active
 * video is within CROSSFADE_S of its end; an `ended` listener performs an
 * immediate swap as a hard fallback so playback can never freeze on the last
 * frame. All timers are generation-guarded so chapter switches invalidate
 * pending work. The loop engine lives entirely in refs — React re-renders
 * (e.g. from robot-movement proximity updates in WorldShell) never touch it.
 *
 * Only the active chapter's pair plays; inactive pairs stay paused with
 * preload="metadata". Falls back to poster / container background on error
 * or reduced motion.
 */
import { memo, useEffect, useRef, useState } from 'react';
import './BackgroundVideoLayer.css';

export type ChapterId = 'cliff' | 'skills' | 'projects';

interface VideoConfig {
  src: string;
  poster: string;
}

const VIDEO_MAP: Record<ChapterId, VideoConfig> = {
  cliff: {
    src: '/assets/backgrounds/surface/bg.mp4',
    poster: '/assets/backgrounds/surface/poster.jpg',
  },
  skills: {
    src: '/assets/backgrounds/infrastructure/bg.mp4',
    poster: '/assets/backgrounds/infrastructure/poster.jpg',
  },
  projects: {
    src: '/assets/backgrounds/core/bg.mp4',
    poster: '/assets/backgrounds/core/poster.jpg',
  },
};

const CROSSFADE_S = 0.5; // crossfade duration, seconds
const TICK_MS = 100; // loop-check interval while a chapter is active
const END_MARGIN_S = 0.25; // trigger crossfade this far ahead of (duration - CROSSFADE_S), so the swap finishes before the clip can end

interface ChapterController {
  chapter: ChapterId;
  videos: [HTMLVideoElement, HTMLVideoElement];
  active: 0 | 1;
  generation: number; // bumped on deactivate; invalidates pending timeouts
  tickId: number | null;
  swapTimeoutId: number | null;
  crossfading: boolean;
  failed: boolean;
  loops: number;
}

interface HandlerSink {
  onVideoReady?: (chapter: ChapterId) => void;
  onVideoError?: (chapter: ChapterId, error: Error) => void;
}

function bumpLoopAttrs(container: HTMLDivElement | null, ctl: ChapterController): void {
  if (!container) return;
  container.setAttribute('data-loops', String(ctl.loops));
  container.setAttribute('data-active-video', String(ctl.active));
}

function createVideoEl(cfg: VideoConfig): HTMLVideoElement {
  const v = document.createElement('video');
  v.src = cfg.src;
  v.poster = cfg.poster;
  v.preload = 'metadata';
  v.muted = true;
  v.playsInline = true;
  v.loop = false; // looping is handled by the crossfade state machine
  v.setAttribute('aria-hidden', 'true');
  v.style.position = 'absolute';
  v.style.inset = '0';
  v.style.width = '100%';
  v.style.height = '100%';
  v.style.objectFit = 'cover';
  v.style.objectPosition = 'center';
  v.style.pointerEvents = 'none';
  v.style.opacity = '0';
  v.style.transition = `opacity ${CROSSFADE_S}s ease`;
  return v;
}

function stopTick(ctl: ChapterController): void {
  if (ctl.tickId !== null) {
    clearInterval(ctl.tickId);
    ctl.tickId = null;
  }
}

function clearSwap(ctl: ChapterController): void {
  if (ctl.swapTimeoutId !== null) {
    clearTimeout(ctl.swapTimeoutId);
    ctl.swapTimeoutId = null;
  }
}

function resetVideo(v: HTMLVideoElement): void {
  v.pause();
  try {
    v.currentTime = 0;
  } catch {
    /* metadata not loaded yet — harmless */
  }
  v.style.opacity = '0';
}

/**
 * Swap the visible player. `immediate` is the hard fallback used when the
 * active video actually ends (timers throttled, tab hidden, etc.) — it cuts
 * in 0.1 s so the background never blanks or freezes on the last frame.
 */
function beginCrossfade(
  ctl: ChapterController,
  immediate: boolean,
  isActiveChapter: () => boolean,
  container: HTMLDivElement | null,
): void {
  if (ctl.failed) return;
  if (ctl.crossfading && !immediate) return;
  const outgoing = ctl.videos[ctl.active];
  const incoming = ctl.videos[1 - ctl.active];
  // If the incoming video has no data yet, skip this tick and retry; the
  // `ended` fallback still guarantees we never freeze.
  if (!immediate && incoming.readyState < 2) return;

  const gen = ctl.generation;
  ctl.crossfading = true;
  ctl.loops += 1;
  bumpLoopAttrs(container, ctl);

  try {
    incoming.currentTime = 0;
  } catch {
    /* not seekable yet */
  }
  incoming.style.transitionDuration = immediate ? '0.1s' : `${CROSSFADE_S}s`;
  const playPromise = incoming.play();
  if (playPromise) {
    playPromise.catch(() => {
      /* autoplay blocked — retried on next user gesture / next tick */
    });
  }
  incoming.style.opacity = '1';
  outgoing.style.opacity = '0';

  const finish = () => {
    if (gen !== ctl.generation || !isActiveChapter()) return;
    outgoing.pause();
    try {
      outgoing.currentTime = 0;
    } catch {
      /* ignore */
    }
    outgoing.style.opacity = '0';
    ctl.active = (1 - ctl.active) as 0 | 1;
    ctl.crossfading = false;
    ctl.swapTimeoutId = null;
    bumpLoopAttrs(container, ctl);
  };

  if (immediate) {
    finish();
  } else {
    ctl.swapTimeoutId = window.setTimeout(finish, CROSSFADE_S * 1000 + 60);
  }
}

function tick(
  ctl: ChapterController,
  isActiveChapter: () => boolean,
  container: HTMLDivElement | null,
): void {
  if (ctl.failed || document.hidden || !isActiveChapter()) return;
  const active = ctl.videos[ctl.active];
  const duration = active.duration;
  if (!isFinite(duration) || duration <= 0) return;
  if (duration - active.currentTime <= CROSSFADE_S + END_MARGIN_S) {
    beginCrossfade(ctl, false, isActiveChapter, container);
  }
}

function activate(
  ctl: ChapterController,
  isActiveChapter: () => boolean,
  container: HTMLDivElement | null,
): void {
  ctl.generation += 1;
  stopTick(ctl);
  clearSwap(ctl);
  ctl.crossfading = false;
  // Buffer both videos of this chapter ahead of the crossfade.
  ctl.videos.forEach((v) => {
    if (v.preload !== 'auto') {
      v.preload = 'auto';
      v.load();
    }
  });
  const active = ctl.videos[ctl.active];
  const other = ctl.videos[1 - ctl.active];
  resetVideo(other);
  active.style.opacity = '1';
  const p = active.play();
  if (p) {
    p.catch(() => {
      /* autoplay blocked — retried on next user gesture */
    });
  }
  ctl.tickId = window.setInterval(() => tick(ctl, isActiveChapter, container), TICK_MS);
}

function deactivate(ctl: ChapterController): void {
  ctl.generation += 1; // invalidate any pending crossfade timeout
  stopTick(ctl);
  clearSwap(ctl);
  ctl.crossfading = false;
  ctl.videos.forEach((v) => {
    v.pause();
    v.style.opacity = '0';
    v.preload = 'metadata';
  });
}

function createController(
  chapter: ChapterId,
  cfg: VideoConfig,
  sink: { current: HandlerSink },
  isActiveChapter: () => boolean,
  getContainer: () => HTMLDivElement | null,
): ChapterController {
  const videos = [createVideoEl(cfg), createVideoEl(cfg)] as [HTMLVideoElement, HTMLVideoElement];
  const ctl: ChapterController = {
    chapter,
    videos,
    active: 0,
    generation: 0,
    tickId: null,
    swapTimeoutId: null,
    crossfading: false,
    failed: false,
    loops: 0,
  };

  videos.forEach((v) => {
    v.addEventListener('ended', () => {
      // Hard fallback: if the visible player somehow reaches the end, swap
      // immediately so the background never freezes on the last frame.
      // Skip when a crossfade is already in flight — its scheduled finish
      // performs the swap (the video ends ~0.5 s after the crossfade starts,
      // i.e. before the finish timer fires; a second swap here would flip
      // the active index twice and wedge the machine).
      if (isActiveChapter() && !ctl.failed && !ctl.crossfading && ctl.videos[ctl.active] === v) {
        beginCrossfade(ctl, true, isActiveChapter, getContainer());
      }
    });
    v.addEventListener('error', () => {
      if (ctl.failed) return;
      ctl.failed = true;
      stopTick(ctl);
      ctl.videos.forEach((x) => {
        x.pause();
        x.style.opacity = '0';
      });
      console.warn(`[BackgroundVideoLayer] video error for chapter "${chapter}"`);
      sink.current.onVideoError?.(chapter, new Error(`Video failed to load: ${cfg.src}`));
    });
  });

  return ctl;
}

interface BackgroundVideoLayerProps {
  chapter: ChapterId;
  reducedMotion: boolean;
  onVideoReady?: (chapter: ChapterId) => void;
  onVideoError?: (chapter: ChapterId, error: Error) => void;
}

function BackgroundVideoLayerImpl({
  chapter,
  reducedMotion,
  onVideoReady,
  onVideoError,
}: BackgroundVideoLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeChapter, setActiveChapter] = useState<ChapterId>(chapter);

  // Mutable sinks so effect deps stay [chapter, reducedMotion] only —
  // parent re-renders (robot movement, proximity) never retrigger effects.
  const sinkRef = useRef<HandlerSink>({});
  sinkRef.current.onVideoReady = onVideoReady;
  sinkRef.current.onVideoError = onVideoError;

  const activeChapterRef = useRef<ChapterId>(chapter);
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  const controllersRef = useRef<Record<ChapterId, ChapterController> | null>(null);
  if (!controllersRef.current) {
    const getContainer = () => containerRef.current;
    controllersRef.current = {
      cliff: createController('cliff', VIDEO_MAP.cliff, sinkRef, () => activeChapterRef.current === 'cliff', getContainer),
      skills: createController('skills', VIDEO_MAP.skills, sinkRef, () => activeChapterRef.current === 'skills', getContainer),
      projects: createController('projects', VIDEO_MAP.projects, sinkRef, () => activeChapterRef.current === 'projects', getContainer),
    };
  }

  // Mount all six video elements once; unmount tears everything down.
  useEffect(() => {
    const container = containerRef.current;
    const controllers = controllersRef.current!;
    if (!container) return;

    (Object.keys(controllers) as ChapterId[]).forEach((ch) => {
      controllers[ch].videos.forEach((v) => {
        if (!v.parentElement) container.appendChild(v);
      });
    });

    // Autoplay can be blocked before the first user gesture — retry the
    // active chapter's playback on any gesture.
    const retryPlay = () => {
      if (reducedMotionRef.current) return;
      const ctl = controllers[activeChapterRef.current];
      if (!ctl || ctl.failed) return;
      const active = ctl.videos[ctl.active];
      if (active.paused) {
        active.style.opacity = '1';
        const p = active.play();
        if (p) p.catch(() => {});
      }
      if (ctl.tickId === null) {
        ctl.tickId = window.setInterval(
          () => tick(ctl, () => activeChapterRef.current === ctl.chapter, containerRef.current),
          TICK_MS,
        );
      }
    };
    window.addEventListener('pointerdown', retryPlay);
    window.addEventListener('keydown', retryPlay);

    // Tab visibility: pause when hidden, resume when visible.
    const onVisibility = () => {
      const ctl = controllers[activeChapterRef.current];
      if (document.hidden) {
        if (ctl) {
          stopTick(ctl);
          ctl.videos.forEach((v) => v.pause());
        }
      } else if (!reducedMotionRef.current && ctl && !ctl.failed) {
        activate(ctl, () => activeChapterRef.current === ctl.chapter, containerRef.current);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('pointerdown', retryPlay);
      window.removeEventListener('keydown', retryPlay);
      document.removeEventListener('visibilitychange', onVisibility);
      (Object.keys(controllers) as ChapterId[]).forEach((ch) => {
        deactivate(controllers[ch]);
        controllers[ch].videos.forEach((v) => v.remove());
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chapter switching + reduced-motion handling. Runs only when the chapter
  // or the reduced-motion preference actually changes.
  useEffect(() => {
    const controllers = controllersRef.current!;
    activeChapterRef.current = chapter;
    setActiveChapter(chapter);
    const el = containerRef.current;
    if (el) el.setAttribute('data-chapter', chapter);

    (Object.keys(controllers) as ChapterId[]).forEach((ch) => {
      if (ch !== chapter) deactivate(controllers[ch]);
    });

    const ctl = controllers[chapter];
    if (el) el.setAttribute('data-loops', String(ctl.loops));

    if (reducedMotion) {
      // Static poster: pause everything, show the first frame of the
      // active chapter's first video.
      (Object.keys(controllers) as ChapterId[]).forEach((ch) => deactivate(controllers[ch]));
      const v = ctl.videos[0];
      try {
        v.currentTime = 0;
      } catch {
        /* ignore */
      }
      v.pause();
      v.style.opacity = '1';
    } else {
      activate(ctl, () => activeChapterRef.current === ctl.chapter, containerRef.current);
    }

    sinkRef.current.onVideoReady?.(chapter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="background-video-layer"
      data-chapter={activeChapter}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-loops="0"
      aria-hidden="true"
    />
  );
}

export const BackgroundVideoLayer = memo(BackgroundVideoLayerImpl);
export default BackgroundVideoLayer;
