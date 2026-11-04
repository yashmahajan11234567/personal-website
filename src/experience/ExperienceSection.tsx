import { useEffect, useRef, useState } from 'react';
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { DestId } from './experience.data';
import { DESTINATIONS, DEST_ORDER } from './experience.data';
import { OVERVIEW_POSE } from './scene/poses';
import { DestinationPanel } from './ui/DestinationPanel';
import { IslandGroup } from './components/IslandGroup';
import { useTransitionController } from './hooks/useTransitionController';
import { useExperienceStore } from './store/experienceStore';
import { CameraRig } from './scene/CameraRig';
import { MagentaTwilightWorld } from './environment/MagentaTwilightWorld';
import './experience.css';

gsap.registerPlugin(ScrollTrigger);

export function ExperienceSection() {
  const [selected, setSelected] = useState<DestId | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useTransitionController();

  const { selectedIsland, isTransitioning, selectIsland, navigate, goBack } = useExperienceStore();

  const handleSelect = (id: 'lighthouse' | 'windmill' | 'pagoda') => {
    setSelected(id);
    selectIsland(id);
  };

  const handleNavigate = (direction: 'next' | 'prev') => {
    if (!selectedIsland || isTransitioning) return; // no conflicting navigation mid-transition
    const i = DEST_ORDER.indexOf(selectedIsland);
    const dir = direction === 'next' ? 1 : -1;
    const nextId = DEST_ORDER[(i + dir + DEST_ORDER.length) % DEST_ORDER.length];
    navigate(direction); // store: circular order + transition lock
    setSelected(nextId); // local: drives camera, panel and island visibility together
  };

  const handleBack = () => {
    if (isTransitioning) return;
    setSelected(null);
    goBack();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedIsland) {
        handleBack();
      } else if (e.key === 'ArrowRight' && selectedIsland) handleNavigate('next');
      else if (e.key === 'ArrowLeft' && selectedIsland) handleNavigate('prev');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* QA/debug handle: current selection + which islands are rendered visible. */
  useEffect(() => {
    const w = window as unknown as { __expState?: unknown };
    w.__expState = {
      selected,
      visible: DEST_ORDER.filter((id) => selected === null || selected === id),
    };
  }, [selected]);

  /* Scrubbed, reversible cinematic hand-off into the next section. */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const env = section.querySelector('.atlas-environment') as HTMLElement | null;
    const header = section.querySelector('.experience-header-container') as HTMLElement | null;
    if (!env) return;
    const ctx = gsap.context(() => {
      gsap.to(env, {
        scale: 0.96,
        opacity: 0.65,
        y: -24,
        filter: 'blur(3px)',
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'bottom 82%', end: 'bottom 30%', scrub: 1 },
      });
      if (header) {
        gsap.to(header, {
          opacity: 0.5,
          y: -12,
          ease: 'none',
          scrollTrigger: { trigger: section, start: 'bottom 86%', end: 'bottom 36%', scrub: 1 },
        });
      }
    }, section);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="experience-section" id="experience" aria-label="Experience">
      <div className="experience-header-container">
        <div className="experience-header">
          <div className="experience-divider" />
          <h2 className="experience-title">EXPERIENCE</h2>
          <div className="experience-divider" />
        </div>
      </div>

      <div className="atlas-environment">
        <Canvas
          camera={{ position: OVERVIEW_POSE.pos, fov: OVERVIEW_POSE.fov, near: 0.5, far: 6500 }}
          shadows
          dpr={[1, 1.75]}
          gl={{ alpha: false, antialias: true }}
        >
          <MagentaTwilightWorld />
          <CameraRig selected={selected} />
          <Suspense fallback={null}>
            {DEST_ORDER.map((id) => (
              <IslandGroup
                key={id}
                id={id}
                selected={selected === id}
                hidden={selected !== null && selected !== id}
                onSelect={handleSelect}
              />
            ))}
          </Suspense>
        </Canvas>

        <div className="atlas-hud">
          <p className="atlas-hint">
            {selected ? 'Drag the island to rotate it' : 'Atlas of Drifting Isles — choose a destination'}
          </p>

          {!selected && (
            <div className="dest-labels" role="group" aria-label="Destinations">
              {DESTINATIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  data-dest={d.id}
                  className="dest-label"
                  onClick={() => handleSelect(d.id)}
                >
                  <strong>{d.landmark}</strong>
                  <span>{d.title}</span>
                </button>
              ))}
            </div>
          )}

          {selected && (
            <>
              <button type="button" className="back-btn" onClick={handleBack}>
                Back to Islands
              </button>

              <div className="dest-nav-side">
                <button
                  type="button"
                  className="nav-arrow"
                  aria-label="Previous destination"
                  onClick={() => handleNavigate('prev')}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="nav-arrow"
                  aria-label="Next destination"
                  onClick={() => handleNavigate('next')}
                >
                  ›
                </button>
              </div>

              <aside ref={panelRef} className="dest-panel-wrap" aria-live="polite">
                <DestinationPanel
                  dest={DESTINATIONS.find((d) => d.id === selected)!}
                  onPrev={() => handleNavigate('prev')}
                  onNext={() => handleNavigate('next')}
                />
              </aside>
            </>
          )}

          <p className="atlas-attribution">
            Island models from{' '}
            <a href="https://github.com/blendi-remade/dioramas" target="_blank" rel="noopener noreferrer">
              Atlas of Drifting Isles
            </a>{' '}
            by blendi-remade,{' '}
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
              CC BY 4.0
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

export default ExperienceSection;