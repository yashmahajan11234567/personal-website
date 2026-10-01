import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { FrameSequenceCanvas } from './FrameSequenceCanvas';
import './Hero.css';

gsap.registerPlugin(ScrollTrigger);

interface HeroProps {
  onComplete: () => void;
}

export const Hero = ({ onComplete }: HeroProps) => {
  const heroRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);
  const onCompleteFired = useRef(false);

  const handleScroll = useCallback((self: ScrollTrigger) => {
    setScrollProgress(self.progress);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      onComplete();
      return;
    }

    const hero = heroRef.current;
    if (!hero) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: 1,
        pin: true,
        anticipatePin: 1,
        onUpdate: handleScroll,
        onLeave: () => {
          if (!onCompleteFired.current) {
            onCompleteFired.current = true;
            console.log('[Hero] onLeave fired, calling onComplete');
            onComplete();
          }
        },
        onLeaveBack: () => {
          console.log('[Hero] onLeaveBack fired');
        },
        onEnter: () => {
          console.log('[Hero] onEnter fired');
        },
        onEnterBack: () => {
          console.log('[Hero] onEnterBack fired');
        },
      }
    });

    scrollTriggerRef.current = tl.scrollTrigger ?? null;

    return () => {
      console.log('[Hero] Cleanup started');
      tl.kill();
      if (scrollTriggerRef.current) {
        scrollTriggerRef.current.kill();
      }
      console.log('[Hero] Cleanup complete');
    };
  }, [onComplete, reducedMotion, handleScroll]);

  return (
    <div ref={heroRef} className="hero">
      <div className="hero__bg" aria-hidden="true" />
      
      <div className="hero__content">
        {/* Left canvas - Data path frames */}
        <div className="hero__canvas-wrapper hero__canvas-wrapper--left">
          <FrameSequenceCanvas side="left" progress={scrollProgress} />
        </div>

        {/* Right canvas - Cloud path frames */}
        <div className="hero__canvas-wrapper hero__canvas-wrapper--right">
          <FrameSequenceCanvas side="right" progress={scrollProgress} />
        </div>
      </div>

      {/* Accessibility: announce current state */}
      <div 
        className="hero__a11y" 
        aria-live="polite" 
        aria-atomic="true"
        style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}
      >
        {scrollProgress < 0.5 ? 'Hero transition: Personal Portfolio to Data and Cloud paths' : 'Path selection available'}
      </div>
    </div>
  );
};

export default Hero;