import type { Project } from './database.types';

const store = new Map<string, Project>();

const DEMO_PROJECTS: Project[] = [
  {
    id: 'demo-1',
    name: 'Renovatie Herengracht',
    client_name: 'Familie De Vries',
    client_address: 'Herengracht 42, Amsterdam',
    client_contact: 'Jan de Vries',
    client_phone: '06-12345678',
    client_email: 'jan@devries.nl',
    btw_nummer: null,
    status: 'In Uitvoering',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    name: 'Nieuwbouw Keizersgracht',
    client_name: 'Bakker B.V.',
    client_address: 'Keizersgracht 100, Amsterdam',
    client_contact: 'Piet Bakker',
    client_phone: '06-87654321',
    client_email: 'piet@bakker.nl',
    btw_nummer: null,
    status: 'Concept',
    created_at: new Date().toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

for (const p of DEMO_PROJECTS) store.set(p.id, p);

export const projectStore = {
  get: (id: string) => store.get(id) ?? null,
  set: (p: Project) => { store.set(p.id, p); },
  all: () => Array.from(store.values()),
  delete: (id: string) => { store.delete(id); },
};
