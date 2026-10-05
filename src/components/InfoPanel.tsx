/**
 * The information panel for a skill or project.
 *
 * WHERE THE TEXT COMES FROM
 *
 * Every word here is read from the Phase 0 content model by id. This component
 * invents nothing: no skill description, no project claim, no technology list, no
 * metric. If the content model does not say it, the panel does not show it.
 *
 * HONESTY IS STRUCTURAL, NOT EDITORIAL
 *
 * A project panel ALWAYS renders the `limitations` field, even when that list says
 * "None identified", and ALWAYS renders `authorship` with collaborators named for
 * collaborative or extended work. Both are required fields in the content model,
 * so an omission here would be a bug rather than a design choice. A skill panel
 * always renders the experience type and the training context when the claim is
 * TRAINING, because coursework must never read as production experience.
 *
 * This is also why the panel is React and not canvas text: these are the exact
 * claims a recruiter will check, and they need to be selectable, linkable and
 * readable by assistive technology.
 *
 * LAYOUT IS A THREE-ROW GRID, AND THAT IS THE WHOLE POINT
 *
 * The audit measured the previous panel inside `.world-canvas`, which sets
 * `overflow: hidden` so the canvas can stay clipped to its frame. Because the
 * panel was `position: absolute; top: 50%` INSIDE that clipped box, any content
 * taller than the stage overflowed symmetrically and was cut off on both edges:
 * `sql-data-warehouse` overflowed by 151px, `primetradeai` by 24px. The measured
 * result was `clippedTop: 59, clippedBottom: 59` with `titleFullyVisible: false`.
 *
 * A second, worse failure came from the same root cause. Clicking an index
 * button at page y=1000 made the browser auto-scroll to it (`scrollY` 0 -> 662),
 * which pushed the stage off-screen and took the panel's Close button with it:
 * measured `panel top:-523 bottom:-64`, `closeFullyVisible: false`,
 * `closeHitTestable: null`. The close control was genuinely unclickable.
 *
 * So the panel is now `position: fixed` in the VIEWPORT, outside the clipped
 * stage, and laid out as `auto 1fr auto` - the header and the footer are pinned
 * rows that never scroll, and only the middle body scrolls. The title can no
 * longer be clipped at the top, and Close is always reachable without scrolling.
 * See `InfoPanel.css`.
 */

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { PORTFOLIO } from '../content';
import type { DashboardPreview, Project, Skill } from '../content/types';
import './InfoPanel.css';

export type PanelKind = 'skill' | 'project';

export interface InfoPanelProps {
  kind: PanelKind;
  /** Content-model id. The record is resolved from the model, never passed in. */
  id: string;
  /** Called when the visitor closes the panel. Escape and the button both use it. */
  onClose: () => void;
  /**
   * Pre-select a gallery entry when the panel opens.
   *
   * Set by the world so pressing Enter on the Data Analytics Dashboards screen
   * opens the panel with the SAME dashboard that screen was showing. The screen
   * cycles five real previews; without this the panel would always open on the
   * first one and the connection between screen and panel would be lost.
   */
  initialDashboardId?: string;
}

/** Human label for an authorship classification. */
const AUTHORSHIP_LABEL: Record<Project['authorship'], string> = {
  solo: 'Built alone',
  collaborative: 'Joint work',
  'extended-existing': 'Took over an existing application',
  course: 'Coursework',
};

/** Human label for an experience type. */
const EXPERIENCE_LABEL: Record<Skill['experience']['experienceType'], string> = {
  PROJECT: 'Shown in a project',
  TRAINING: 'Training only',
  BOTH: 'Coursework and project',
  UNCERTAIN: 'Evidence too thin to classify',
};

/**
 * The dashboard gallery: a large preview plus a selectable strip.
 *
 * The five images are committed under `public/assets/dashboards/` and their
 * aspect ratios differ sharply (962x593 through 2024x1449), so every one renders
 * with `object-fit: contain` inside a fixed-ratio frame. That letterboxes rather
 * than stretches: a stretched dashboard would misrepresent the artefact it shows,
 * which is the one thing these previews must not do.
 */
const DashboardGallery = ({
  dashboards,
  selectedId,
  onSelect,
}: {
  dashboards: readonly DashboardPreview[];
  selectedId: string;
  onSelect: (id: string) => void;
}) => {
  const selected = dashboards.find((d) => d.id === selectedId) ?? dashboards[0];
  if (!selected) return null;

  return (
    <div className="info-panel__section info-panel__section--gallery">
      <h4>Dashboard gallery</h4>

      <figure className="info-panel__preview">
        <img
          src={selected.previewPath}
          alt={`${selected.title} dashboard, built in ${selected.technology}`}
          data-testid={`dashboard-preview-${selected.id}`}
        />
        <figcaption>
          <strong>{selected.title}</strong>
          <span className="info-panel__tag">{selected.technology}</span>
        </figcaption>
      </figure>

      <p className="info-panel__gallery-summary">{selected.summary}</p>

      {/* The selector. Real buttons, so it is keyboard and screen-reader operable. */}
      <ul className="info-panel__gallery-list">
        {dashboards.map((dash) => (
          <li key={dash.id}>
            <button
              type="button"
              className="info-panel__gallery-item"
              data-testid={`dashboard-select-${dash.id}`}
              data-selected={dash.id === selected.id ? 'true' : undefined}
              aria-pressed={dash.id === selected.id}
              onClick={() => onSelect(dash.id)}
            >
              <img src={dash.previewPath} alt="" aria-hidden="true" />
              <span className="info-panel__gallery-label">{dash.title}</span>
              <span className="info-panel__tag">{dash.technology}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const SkillPanel = ({ skill }: { skill: Skill }) => {
  const { experience, visual } = skill;
  // TRAINING and BOTH claims must carry their context, or the claim is
  // unsupported. The content model enforces this; rendering it again here means
  // a future data edit cannot quietly drop it from the panel.
  const needsContext =
    experience.experienceType === 'TRAINING' || experience.experienceType === 'BOTH';

  return (
    <>
      <h3 className="info-panel__title">{skill.name}</h3>

      {/*
        The one-line summary is the whole point of the panel: a recruiter should
        understand the skill in three to five seconds. It is `Skill.summary`,
        which the content model states is one line of plain description and never
        a metric.
      */}
      <p className="info-panel__summary">{skill.summary}</p>

      <dl className="info-panel__facts">
        <dt>Experience</dt>
        <dd>{EXPERIENCE_LABEL[experience.experienceType]}</dd>
        {needsContext && experience.trainingContext && (
          <>
            <dt>Context</dt>
            <dd>{experience.trainingContext}</dd>
          </>
        )}
        <dt>Drawn as</dt>
        <dd>{visual.treatment === 'scaffold' ? 'Scaffolding' : 'A built station'}</dd>
      </dl>

      {/*
        Evidence, only when the content model records it. These are repository
        facts already vetted by the audit, so they are shown verbatim rather than
        summarised.
      */}
      {experience.evidence.length > 0 && (
        <div className="info-panel__section">
          <h4>Evidence</h4>
          <ul>
            {experience.evidence.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {/*
        Repositories, one link per entry. These are absolute URLs - the content
        model validates that and `validateContent()` reports a
        `bad-repository-url` issue otherwise. The previous bare `repository: string`
        put `"Bluestock_fintech, Sql-data-warehouse"` straight into an `href`,
        which is why every skill link in the old build was dead.
      */}
      {experience.repositories && experience.repositories.length > 0 && (
        <div className="info-panel__section">
          <h4>Repositories</h4>
          <ul className="info-panel__links">
            {experience.repositories.map((repo) => (
              <li key={repo.url}>
                <a href={repo.url} target="_blank" rel="noreferrer noopener">
                  {repo.name}
                  <span className="visually-hidden">
                    {' '}
                    for {skill.name} (opens in a new tab)
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
};

const ProjectPanel = ({
  project,
  selectedDashboardId,
  onSelectDashboard,
}: {
  project: Project;
  selectedDashboardId: string;
  onSelectDashboard: (id: string) => void;
}) => (
  <>
    {/*
      THE TITLE IS THE REPOSITORY LINK.

      The audit found the title rendered as plain text
      (`<h3>{project.title}</h3>`) with the repository reachable only through a
      generic "Repository" link at the very bottom of a scrolling panel. The
      requirement was that the project title itself be a visible, real repository
      hyperlink - so the `h3` wraps an anchor whenever `github` exists, and it is
      underlined so it reads as a link rather than as a heading that happens to be
      clickable.

      A project without a `github` URL still renders its title, unlinked, so a
      future record cannot produce a misleading dead link.
    */}
    <h3 className="info-panel__title">
      {project.github ? (
        <a
          className="info-panel__title-link"
          href={project.github}
          target="_blank"
          rel="noreferrer noopener"
          data-testid="project-title-link"
        >
          {project.title}
          <span className="visually-hidden"> (opens the repository in a new tab)</span>
        </a>
      ) : (
        project.title
      )}
    </h3>

    <p className="info-panel__summary">{project.description}</p>

    {/*
      Authorship comes FIRST, before the description. The audit's rule is that
      coursework must not read as production experience and joint work must not
      read as solo; putting the classification above the pitch makes that
      structural rather than a matter of copy tone.
    */}
    <dl className="info-panel__facts">
      <dt>Authorship</dt>
      <dd>{AUTHORSHIP_LABEL[project.authorship]}</dd>
      {project.collaborators && project.collaborators.length > 0 && (
        <>
          <dt>Also by</dt>
          <dd>
            {project.collaborators.map((c) => (
              <span key={c.name} className="info-panel__collaborator">
                {c.name} — {c.role}
              </span>
            ))}
          </dd>
        </>
      )}
      {/*
        `contribution` describes only what THIS person added. For
        extended-existing work that is the added work, never the original
        application, which is why it is labelled "My contribution".
      */}
      <dt>My contribution</dt>
      <dd>{project.contribution}</dd>
    </dl>

    {/*
      The gallery comes directly after the facts: for a project whose whole point
      is its dashboards, the previews are the content, and burying them below the
      pipeline list is what made the previous panel feel like a wall of text.
    */}
    {project.dashboards && project.dashboards.length > 0 && (
      <DashboardGallery
        dashboards={project.dashboards}
        selectedId={selectedDashboardId}
        onSelect={onSelectDashboard}
      />
    )}

    {project.technologies.length > 0 && (
      <div className="info-panel__section">
        <h4>Technologies</h4>
        <ul className="info-panel__tags">
          {project.technologies.map((tech) => (
            <li key={tech}>{tech}</li>
          ))}
        </ul>
      </div>
    )}

    {/* The pipeline the project actually runs, in execution order. */}
    {project.workflow.stages.length > 0 && (
      <div className="info-panel__section">
        <h4>Pipeline</h4>
        <ol className="info-panel__pipeline">
          {project.workflow.stages.map((stage) => (
            <li key={stage.id}>
              <strong>{stage.label}</strong>
              {stage.detail && <span> — {stage.detail}</span>}
            </li>
          ))}
        </ol>
      </div>
    )}

    {project.results && project.results.length > 0 && (
      <div className="info-panel__section">
        <h4>Outcomes</h4>
        <ul>
          {project.results.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    )}

    {/*
      Limitations are REQUIRED by the content model and always rendered here,
      including an explicit "None identified". The point is that a project which
      does not run says so on its own panel, where a reader cannot miss it.
    */}
    <div className="info-panel__section info-panel__section--limits">
      <h4>Limitations</h4>
      <ul>
        {project.limitations.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>

    {project.evidence && project.evidence.length > 0 && (
      <div className="info-panel__section">
        <h4>Where the evidence lives</h4>
        <ul>
          {project.evidence.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    )}

    {project.demo && (
      <p className="info-panel__links">
        <a href={project.demo} target="_blank" rel="noreferrer noopener">
          Demo
          <span className="visually-hidden"> for {project.title} (opens in a new tab)</span>
        </a>
      </p>
    )}
  </>
);

export const InfoPanel = ({ kind, id, onClose, initialDashboardId }: InfoPanelProps) => {
  /*
   * Resolve from the content model by id.
   *
   * The two records are different types, so they are looked up separately rather
   * through a union that TypeScript cannot narrow on `kind`. If the id does not
   * resolve, an honest "not found" is rendered rather than an empty panel: a
   * silently blank panel would read as "this project has no details", which is a
   * claim the content model never made.
   */
  const skill = kind === 'skill' ? PORTFOLIO.skills[id] : undefined;
  const project = kind === 'project' ? PORTFOLIO.projects[id] : undefined;
  const title = skill?.name ?? project?.title;
  const dashboards = project?.dashboards;

  /*
   * Gallery selection is panel state, so the chosen dashboard survives
   * re-renders and can be seeded from the world screen that opened the panel.
   * `initialDashboardId` is read through a lazy initialiser so it applies on
   * mount without an effect that would flash the first entry first.
   */
  const [selectedDashboard, setSelectedDashboard] = useState(
    () => initialDashboardId ?? dashboards?.[0]?.id ?? '',
  );

  // If the panel is reused for a different project, reset to that project's first.
  useEffect(() => {
    setSelectedDashboard(initialDashboardId ?? dashboards?.[0]?.id ?? '');
  }, [id, initialDashboardId, dashboards]);

  /*
   * MOVE FOCUS INTO THE PANEL, AND RETURN IT ON CLOSE.
   *
   * The panel is `role="dialog"` with `aria-modal="true"`, so assistive
   * technology treats everything outside it as inert. Without an explicit focus
   * move a keyboard user's focus would stay on the canvas - which the game has
   * just locked - so Tab would walk the hidden page behind the dialog instead of
   * walking the dialog.
   *
   * The restore on unmount is the other half: after Escape or Close, focus goes
   * back to the control that opened the panel, so the visitor is not dropped at
   * the top of the document.
   */
  const panelRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement;
    // Focus the dialog itself rather than the Close button: the first Tab then
    // moves to Close, which is the natural reading order for a dialog.
    panelRef.current?.focus();
    return () => {
      const restore = restoreFocusRef.current;
      if (restore instanceof HTMLElement && document.contains(restore)) restore.focus();
    };
  }, []);

  /*
   * TRAP TAB INSIDE THE PANEL.
   *
   * Required because the panel is modal: Tab past the last focusable element
   * would otherwise land on the page behind it. Escape is handled in React (see
   * `WorldShell`), so only the focus wrap is handled here.
   */
  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <aside
      className="info-panel"
      data-testid="info-panel"
      data-panel-kind={kind}
      data-panel-id={id}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Details'}
      ref={panelRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      {/*
        PINNED HEADER ROW.

        The "Kind" label and the close button sit in their own grid row above the
        scrolling body, and the title is the first thing in the body with its own
        non-collapsing margin. Together with the grid rows in `InfoPanel.css` this
        guarantees the title is never clipped at the top however long the body
        grows. The audit measured the old panel clipping 151px of the SQL
        warehouse panel and 59px off each edge.
      */}
      <header className="info-panel__header">
        <p className="info-panel__kind">{kind === 'skill' ? 'Skill' : 'Project'}</p>

        {/*
          THE LABELLED BACK CONTROL.

          The report was that getting out of a panel meant pressing Escape every
          time, and that is accurate for a mouse-only visitor: before this pass
          the panel offered a bare `×` glyph and a muted `Close` strip, and a
          visitor has to interpret a 16px glyph as "leave this dialog". The
          request was for a button that says BACK, so that is what this is — a
          real `<button>` with visible text, in the normal tab order, carrying an
          accessible name that states where it goes.

          It calls the same `onClose` as the `×` and the footer strip. All three
          are equivalent routes out; none of them depends on the keyboard. The
          `×` is kept because "close this dialog" and "go back to the world" are
          both reasonable intentions and both are served now.
        */}
        <button
          type="button"
          className="info-panel__back"
          onClick={onClose}
          data-testid="panel-back"
          aria-label={`Back to the ${kind === 'skill' ? 'skills' : 'projects'} chapter`}
        >
          <span aria-hidden="true">&larr;</span>
          Back
          <span className="visually-hidden"> to the world</span>
        </button>

        {/*
          THE ALWAYS-VISIBLE CLOSE CONTROL.

          The previous close button was a full-width muted strip at the very
          BOTTOM of a scrolling container - the lowest-contrast element in the
          panel, and off-screen entirely when the page auto-scrolled. This is a
          labelled icon button in the header, so it is visible and hit-testable
          without scrolling whatever the body length. The footer Close button is
          kept as well, so there are three routes out and none depends on
          scrolling.
        */}
        <button
          type="button"
          className="info-panel__close-icon"
          onClick={onClose}
          data-testid="panel-close-icon"
          aria-label={`Close this ${kind} panel`}
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </header>

      <div className="info-panel__body">
        {kind === 'skill' ? (
          skill ? (
            <SkillPanel skill={skill} />
          ) : (
            <p className="info-panel__missing">That skill is not in the content model.</p>
          )
        ) : project ? (
          <ProjectPanel
            project={project}
            selectedDashboardId={selectedDashboard}
            onSelectDashboard={setSelectedDashboard}
          />
        ) : (
          <p className="info-panel__missing">That project is not in the content model.</p>
        )}
      </div>

      <button
        type="button"
        className="info-panel__close"
        onClick={onClose}
        data-testid="panel-close"
      >
        Close
        <span className="visually-hidden"> this {kind} panel</span>
      </button>
    </aside>
  );
};

export default InfoPanel;
