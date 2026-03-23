import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Pencil, Check } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import type { Project, ProjectStatus } from '../../lib/database.types';

const statusStyles: Record<ProjectStatus, string> = {
  Concept: 'bg-light/10 text-light/60',
  'Offerte Verstuurd': 'bg-accent/15 text-accent',
  Akkoord: 'bg-green-500/15 text-green-400',
  'In Uitvoering': 'bg-amber-500/15 text-amber-400',
  Afgerond: 'bg-light/5 text-light/40',
};

const TABS = [
  { value: 'blauwdruk', label: 'Blauwdruk' },
  { value: 'materialen', label: 'Materialen' },
  { value: 'uren', label: 'Uren' },
  { value: 'offerte', label: 'Offerte' },
  { value: 'contract', label: 'Contract' },
] as const;

interface ProjectSidePanelProps {
  project: Project;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onUpdate: (values: Partial<Project>) => Promise<void>;
  onReset: () => Promise<void>;
}

export default function ProjectSidePanel({
  project,
  activeTab,
  onTabChange,
  onUpdate,
  onReset,
}: ProjectSidePanelProps) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    client_name: project.client_name ?? '',
    client_address: project.client_address ?? '',
    btw_nummer: project.btw_nummer ?? '',
    client_contact: project.client_contact ?? '',
    client_phone: project.client_phone ?? '',
    client_email: project.client_email ?? '',
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    await onUpdate(form);
    setEditing(false);
  };

  const handleReset = async () => {
    setResetting(true);
    try { await onReset(); setConfirmOpen(false); }
    finally { setResetting(false); }
  };

  const clientFields: { label: string; key: keyof typeof form; type?: string }[] = [
    { label: 'Klantnaam', key: 'client_name' },
    { label: 'Adres', key: 'client_address' },
    { label: 'BTW-nummer', key: 'btw_nummer' },
    { label: 'Contactpersoon', key: 'client_contact' },
    { label: 'Telefoonnummer', key: 'client_phone' },
    { label: 'E-mail', key: 'client_email', type: 'email' },
  ];

  return (
    <aside className="w-72 shrink-0 flex flex-col h-full border-r border-dark-border bg-dark overflow-y-auto">
      {/* Back */}
      <div className="px-4 pt-4 pb-3 border-b border-dark-border">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-1.5 text-sm text-light/50 hover:text-light transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Projecten
        </button>
      </div>

      {/* Project info */}
      <div className="px-4 py-4 border-b border-dark-border space-y-3">
        <div>
          <h1 className="text-base font-bold text-light leading-tight">{project.name}</h1>
          <span className={`inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[project.status]}`}>
            {project.status}
          </span>
        </div>

        <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Dialog.Trigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <RotateCcw size={13} className="mr-1.5" />
              Begin Opnieuw
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm rounded-xl bg-dark-card border border-dark-border p-6 shadow-xl">
              <Dialog.Title className="text-lg font-semibold text-light mb-2">Project resetten?</Dialog.Title>
              <Dialog.Description className="text-sm text-light/50 mb-5">
                Dit zet de status terug naar Concept. Weet je het zeker?
              </Dialog.Description>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Annuleren</Button>
                <Button onClick={handleReset} disabled={resetting}>
                  {resetting ? 'Bezig...' : 'Ja, reset'}
                </Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Client details */}
      <div className="px-4 py-4 border-b border-dark-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-light/30">Klantgegevens</span>
          {!editing && (
            <button onClick={() => setEditing(true)} className="p-1 rounded text-light/30 hover:text-light transition-colors cursor-pointer">
              <Pencil size={12} />
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            {clientFields.map(f => (
              <Input key={f.key} label={f.label} type={f.type} value={form[f.key]} onChange={set(f.key)} />
            ))}
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer"
            >
              <Check size={12} /> Opslaan
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {clientFields.map(f => (
              <div key={f.key} className="flex gap-1 text-xs">
                <span className="text-light/35 shrink-0">{f.label}:</span>
                <span className="text-light/65 break-all">{form[f.key] || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <nav className="flex-1 py-3">
        {TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${
              activeTab === tab.value
                ? 'bg-accent/10 text-accent border-r-2 border-accent'
                : 'text-light/50 hover:text-light hover:bg-dark-card'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
