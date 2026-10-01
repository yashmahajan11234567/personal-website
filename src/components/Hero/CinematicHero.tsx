import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { FrameSequenceCanvas } from './FrameSequenceCanvas';
import { SelectionVideo } from './SelectionVideo';
import cinematicBeats from '../../data/cinematic-beats.json';
import selectionConfig from '../../data/selection-compositing.json';
import './CinematicHero.css';

gsap.registerPlugin(ScrollTrigger);

interface CinematicHeroProps {
  onTransitionComplete: (path: 'data' | 'cloud') => void;
}

type HeroPhase = 'intro' | 'diverging' | 'dual' | 'selection' | 'transitioning';

export const CinematicHero = ({ onTransitionComplete }: CinematicHeroProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [scrollProgress, setScrollProgress] = useState(0);
  const [phase, setPhase] = useState<HeroPhase>('intro');
  const [pendingPath, setPendingPath] = useState<'data' | 'cloud' | null>(null);
  const [selectedPath, setSelectedPath] = useState<'data' | 'cloud' | null>(null);
  const [crossfade, setCrossfade] = useState(0); // 0 = left, 1 = right, 0-1 = crossfade
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartRef = useRef<number>(0);
  const animationStartProgressRef = useRef<number>(0);

  const handleScroll = useCallback((self: ScrollTrigger) => {
    if (selectedPath) return; // Stop scroll scrubbing after selection
    
    const prog = self.progress;
    setScrollProgress(prog);
    
    const phases = selectionConfig.phases;
    if (prog < phases.intro.progress[1]) setPhase('intro');
    else if (prog < phases.diverging.progress[1]) {
      setPhase('diverging');
      // Calculate crossfade: 0 at start of diverging, 1 at end
      const divergingStart = phases.diverging.progress[0];
      const divergingEnd = phases.diverging.progress[1];
      const crossfade = (prog - divergingStart) / (divergingEnd - divergingStart);
      setCrossfade(Math.max(0, Math.min(1, crossfade)));
    }
    else if (prog < phases.dual.progress[1]) {
      setPhase('dual');
      setCrossfade(1); // Fully switched to right/cloud
    }
    else if (prog < phases.selection.progress[1]) {
      setPhase('selection');
      setCrossfade(1);
    }
    else {
      setPhase('transitioning');
      setCrossfade(1);
    }
  }, [selectedPath]);

  useEffect(() => {
    if (reducedMotion) {
      // For reduced motion, skip scroll animation but still allow selection
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
  }, [reducedMotion, handleScroll]);

  // For reduced motion: auto-advance to selection phase after a brief moment
  useEffect(() => {
    if (!reducedMotion) return;
    
    console.log('[CinematicHero] Reduced motion effect running, setting timeout');
    const timer = setTimeout(() => {
      console.log('[CinematicHero] Reduced motion timeout fired');
      // Jump to selection phase scroll progress
      const selectionStart = selectionConfig.phases.selection.progress[0];
      console.log('[CinematicHero] Setting scrollProgress to:', selectionStart);
      setScrollProgress(selectionStart);
      // Also update phase directly since handleScroll won't be called
      setPhase('selection');
    }, 1000);
    
    return () => {
      console.log('[CinematicHero] Reduced motion cleanup');
      clearTimeout(timer);
    };
  }, [reducedMotion]);

  // Auto-play selected path to completion
  useEffect(() => {
    if (!selectedPath) return;
    
    // Kill scroll trigger
    if (scrollTriggerRef.current) {
      scrollTriggerRef.current.kill();
      scrollTriggerRef.current = null;
    }
    
    const totalDuration = selectedPath === 'data' 
      ? cinematicBeats.left.transitionComplete 
      : cinematicBeats.right.transitionComplete;
    
    const remainingProgress = 1.0 - scrollProgress;
    const remainingTime = remainingProgress * totalDuration;
    
    console.log(`[CinematicHero] Auto-playing ${selectedPath} from ${scrollProgress} for ${remainingTime}s`);
    
    animationStartRef.current = performance.now();
    animationStartProgressRef.current = scrollProgress;
    
    const animate = (timestamp: number) => {
      const elapsed = (timestamp - animationStartRef.current) / 1000;
      const progress = Math.min(1.0, animationStartProgressRef.current + elapsed / totalDuration);
      
      setScrollProgress(progress);
      
      if (progress >= 1.0) {
        console.log(`[CinematicHero] ${selectedPath} cinematic complete`);
        animationFrameRef.current = null;
        onTransitionComplete(selectedPath);
      } else {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [selectedPath, onTransitionComplete]);

  const handlePathSelect = useCallback((path: 'data' | 'cloud') => {
    if (phase !== 'selection' || selectedPath) return;
    
    console.log(`[CinematicHero] Path selected: ${path}`);
    setSelectedPath(path);
    setPendingPath(path);
  }, [phase, selectedPath]);

  const activeSide = pendingPath === 'data' ? 'left' : 
                     pendingPath === 'cloud' ? 'right' : 
                     phase === 'intro' ? 'left' : 'left';

  return (
    <div ref={containerRef} className="cinematic-hero" data-phase={phase}>
      {/* Main cinematic canvas for intro/diverging/dual phases */}
      <canvas 
        ref={canvasRef}
        id="cinematic-canvas"
        width={1920}
        height={1080}
        className="cinematic-hero__main-canvas"
        aria-hidden="true"
      />
      
      <FrameSequenceCanvas
        side={activeSide}
        progress={scrollProgress}
        canvasRef={canvasRef}
        crossfade={crossfade}
      />
      
      {/* Selection video overlay during selection phase */}
      {(phase === 'selection' || phase === 'transitioning') && (
        <div 
          ref={videoContainerRef}
          className="cinematic-hero__selection-video-container"
          aria-hidden={phase !== 'selection'}
        >
          <SelectionVideo
            progress={scrollProgress}
            isSelectionPhase={phase === 'selection'}
            onPathSelect={handlePathSelect}
            reducedMotion={reducedMotion}
            containerRef={videoContainerRef}
          />
        </div>
      )}
      
      <div className="cinematic-hero__a11y" aria-live="polite" aria-atomic="true">
        {phase === 'intro' && 'Cinematic introduction: Personal Portfolio'}
        {phase === 'diverging' && 'Paths diverging: Data and Cloud journeys begin'}
        {phase === 'dual' && 'Active path visible: Data or Cloud'}
        {phase === 'selection' && 'Choose your path: Data (left board) or Cloud (right board)'}
        {selectedPath && `Playing ${selectedPath} cinematic to completion`}
        {phase === 'transitioning' && `Entering ${selectedPath} world`}
      </div>
    </div>
  );
};

export default CinematicHero;
