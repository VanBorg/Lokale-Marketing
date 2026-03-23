import type { Project } from './database.types';

const store = new Map<string, Project>();

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

const now = Date.now();
const day = 86400000;

/** Offline demo: één project per status, elk met een eigen klant (unieke namen). */
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
    created_at: new Date(now - 120 * day).toISOString(),
    updated_at: new Date(now).toISOString(),
    is_favorite: true,
  },
  {
    id: 'demo-2',
    name: 'Nieuwbouw Keizersgracht',
    client_name: 'Bakker B.V.',
    client_address: 'Keizersgracht 100, Amsterdam',
    client_contact: 'Piet Bakker',
    client_phone: '06-87654321',
    client_email: 'piet@bakker.nl',
    btw_nummer: 'NL123456789B01',
    status: 'Concept',
    created_at: new Date(now - 14 * day).toISOString(),
    updated_at: new Date(now - 1 * day).toISOString(),
    is_favorite: false,
  },
  {
    id: 'demo-3',
    name: 'Badkamer Prinsengracht',
    client_name: 'Van den Heuvel Holding',
    client_address: 'Prinsengracht 88, Amsterdam',
    client_contact: 'Sophie van den Heuvel',
    client_phone: '020-5550192',
    client_email: 'sophie@vdheuvel.nl',
    btw_nummer: null,
    status: 'Offerte Verstuurd',
    created_at: new Date(now - 10 * day).toISOString(),
    updated_at: new Date(now - 2 * day).toISOString(),
    is_favorite: false,
  },
  {
    id: 'demo-4',
    name: 'Dakkapel Singel',
    client_name: 'Jansen & Zoon',
    client_address: 'Singel 210, Amsterdam',
    client_contact: 'Tom Jansen',
    client_phone: '06-99887766',
    client_email: 'tom@jansenenzoon.nl',
    btw_nummer: null,
    status: 'Akkoord',
    created_at: new Date(now - 45 * day).toISOString(),
    updated_at: new Date(now - 3 * day).toISOString(),
    is_favorite: false,
  },
  {
    id: 'demo-5',
    name: 'Keuken Jordaan',
    client_name: 'Studio Noord Ontwerp',
    client_address: 'Elandsgracht 15, Amsterdam',
    client_contact: 'Lisa Vermeer',
    client_phone: '06-11223344',
    client_email: 'lisa@studionoord.nl',
    btw_nummer: null,
    status: 'Afgerond',
    created_at: new Date(now - 200 * day).toISOString(),
    updated_at: new Date(now - 30 * day).toISOString(),
    is_favorite: false,
  },
];

for (const p of DEMO_PROJECTS) store.set(p.id, p);

export const projectStore = {
  get: (id: string) => store.get(id) ?? null,
  set: (p: Project) => {
    store.set(p.id, p);
    notify();
  },
  all: () => Array.from(store.values()),
  delete: (id: string) => {
    store.delete(id);
    notify();
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
