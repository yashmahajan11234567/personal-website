/**
 * CoursesCarousel — horizontal scrolling carousel of course/certificate cards.
 * Pure CSS scroll-snap, no JS animation library.
 * Respects prefers-reduced-motion.
 */
import { useRef, useEffect, useState } from 'react';
import { COURSES, getProviderColor, type CourseEntry } from '../content/courses';
import './CoursesCarousel.css';

interface CoursesCarouselProps {
  /** Optional aria label for the section */
  ariaLabel?: string;
}

export function CoursesCarousel({ ariaLabel = 'Courses and Certifications' }: CoursesCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const check = () => setScrollable(track.scrollWidth > track.clientWidth + 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(track);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      if (track.scrollLeft > 24) setShowScrollHint(false);
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    return () => track.removeEventListener('scroll', onScroll);
  }, []);

  const scrollBy = (dir: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const cardWidth = 320; // card width + gap
    track.scrollBy({ left: dir * cardWidth, behavior: 'smooth' });
  };

  return (
    <section className="courses-carousel-section" aria-labelledby="courses-heading">
      <div className="courses-header">
        <h2 id="courses-heading" className="courses-title">COURSES & CERTIFICATIONS</h2>
        <p className="courses-subtitle">Verified completions from coursework and online platforms</p>
      </div>

      <div className="courses-track-wrapper">
        <button
          className="courses-nav courses-nav--prev"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll courses left"
          disabled={!scrollable}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="courses-track" ref={trackRef} role="list" aria-label={ariaLabel}>
          {COURSES.map((course: CourseEntry) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>

        <button
          className="courses-nav courses-nav--next"
          onClick={() => scrollBy(1)}
          aria-label="Scroll courses right"
          disabled={!scrollable}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {showScrollHint && scrollable && (
        <p className="courses-scroll-hint" aria-hidden="true">
          Scroll or use arrows →
        </p>
      )}
    </section>
  );
}

interface CourseCardProps {
  course: CourseEntry;
}

function CourseCard({ course }: CourseCardProps) {
  const providerColor = getProviderColor(course.provider);
  const hasCert = !!course.certificateSrc;

  return (
    <article className="course-card" role="listitem" style={{ '--provider-color': providerColor } as React.CSSProperties}>
      <div className="course-card-inner">
        <header className="course-header">
          <span className="course-provider">{course.provider}</span>
          <span className="course-date">{course.date}</span>
        </header>

        <h3 className="course-title">{course.title}</h3>

        <ul className="course-skills" aria-label="Skills covered">
          {course.skills.slice(0, 5).map((skill: string, i: number) => (
            <li key={i} className="course-skill">{skill}</li>
          ))}
          {course.skills.length > 5 && (
            <li className="course-skill course-skill--more">+{course.skills.length - 5} more</li>
          )}
        </ul>

        {hasCert && course.certificateSrc && (
          <div className="course-certificate">
            <img src={course.certificateSrc} alt={`${course.title} certificate`} loading="lazy" />
          </div>
        )}

        {course.verifyUrl && (
          <a
            href={course.verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="course-verify"
            aria-label={`Verify ${course.title} certificate`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <span>Verify</span>
          </a>
        )}
      </div>
    </article>
  );
}