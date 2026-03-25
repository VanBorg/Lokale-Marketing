import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { useProjects } from '../../hooks/useProjects';
import type { Project } from '../../lib/database.types';

/** Defaults voor een nieuw project (nieuwe klant) — velden kun je later in het project invullen. */
const NEW_BLUEPRINT_PROJECT: Partial<Project> = {
  name: 'Nieuw project',
  status: 'Concept',
  client_name: null,
  client_address: null,
  client_contact: null,
  client_phone: null,
  client_email: null,
  btw_nummer: null,
};

/**
 * Voorkomt dubbele project-aanmaak bij React Strict Mode (effect draait 2×):
 * één gedeelde promise per bezoek aan deze route.
 */
let blauwdrukStartPromise: Promise<string> | null = null;

function getOrCreateBlauwdrukProject(
  createProject: (values: Partial<Project>) => Promise<Project | undefined>,
): Promise<string> {
  if (!blauwdrukStartPromise) {
    blauwdrukStartPromise = (async () => {
      try {
        const project = await createProject(NEW_BLUEPRINT_PROJECT);
        if (!project?.id) throw new Error('Project kon niet worden aangemaakt.');
        return project.id;
      } finally {
        queueMicrotask(() => {
          blauwdrukStartPromise = null;
        });
      }
    })();
  }
  return blauwdrukStartPromise;
}

/** Maakt een nieuw project aan en stuurt door naar de blauwdruk-tab. */
export default function BlauwdrukStartPage() {
  const navigate = useNavigate();
  const { createProject } = useProjects();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    getOrCreateBlauwdrukProject(createProject)
      .then(id => {
        if (!cancelled) navigate(`/project/${id}`, { replace: true });
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Er ging iets mis bij het aanmaken.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [createProject, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <p className="text-light/70 mb-2 max-w-md">{error}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" onClick={() => window.location.assign('/blauwdruk')}>
            Opnieuw proberen
          </Button>
          <Link
            to="/dashboard"
            className="ui-btn ui-btn--ghost ui-btn--md inline-flex items-center justify-center"
          >
            Naar dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-24" aria-busy="true" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 rounded-full border-2 border-dark-border border-t-accent animate-spin"
          aria-hidden
        />
        <p className="text-sm text-light/50">Nieuw project wordt aangemaakt…</p>
      </div>
    </div>
  );
}
