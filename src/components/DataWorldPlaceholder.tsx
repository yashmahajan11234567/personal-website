import { useCallback } from 'react';
import styles from './DataWorldPlaceholder.module.css';

interface DataWorldPlaceholderProps {
  /** Called when the user chooses to leave the placeholder. */
  onExit: () => void;
}

/**
 * Minimal Data World placeholder.
 *
 * Mounts at `#/data-world` so the route stays wired while the real game
 * is rebuilt from scratch. Zero Phaser, zero assets, zero old game UI.
 */
export function DataWorldPlaceholder({ onExit }: DataWorldPlaceholderProps) {
  const handleExit = useCallback(() => {
    onExit();
  }, [onExit]);

  return (
    <section
      className={styles.dataWorldPlaceholder}
      role="region"
      aria-label="Data World — under construction"
    >
      <header className={styles.placeholderHeader}>
        <h1>Data World</h1>
        <p className={styles.placeholderSubtitle}>
          Rebuilding from scratch — new reference images coming soon.
        </p>
      </header>

      <main className={styles.placeholderBody}>
        <p>
          The original Phaser implementation has been removed. This route
          intentionally shows an empty state so you can verify routing and
          navigation without loading any legacy game code.
        </p>

        <ul className={styles.placeholderStatus}>
          <li>✓ Route <code>#/data-world</code> operational</li>
          <li>✓ No Phaser loaded</li>
          <li>✓ No legacy assets loaded</li>
          <li>✓ Ready for new implementation</li>
        </ul>
      </main>

      <footer className={styles.placeholderFooter}>
        <button
          type="button"
          className={styles.placeholderExitButton}
          onClick={handleExit}
          aria-label="Return to world selection"
        >
          ← Back to selection
        </button>
      </footer>
    </section>
  );
}