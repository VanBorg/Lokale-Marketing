import { Navigate, useParams } from 'react-router-dom';

const META: Record<string, { title: string; description: string }> = {
  offerte: {
    title: 'Offerte tool',
    description: 'Gebruikt blauwdrukdata om PDF-offertes te genereren.',
  },
  materiaallijst: {
    title: 'Materiaallijst',
    description: 'Gebruikt blauwdrukdata voor bestellingen en materiaaloverzichten.',
  },
  urenregistratie: {
    title: 'Urenregistratie',
    description: 'Koppelt uren aan je projecten.',
  },
  'document-scanner': {
    title: 'Document scanner',
    description: 'Bonnetjes, facturen en overige documenten scannen en archiveren.',
  },
};

export default function ComingSoonToolPage() {
  const { toolId } = useParams();
  const meta = toolId ? META[toolId] : undefined;
  if (!meta) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-[50vh] flex-col">
      <div className="mb-6 shrink-0 border-b border-dark-border pb-4">
        <h1 className="text-lg font-semibold text-light">{meta.title}</h1>
        <p className="mt-1 text-sm text-light/50">{meta.description}</p>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <p className="text-light/50">Binnenkort beschikbaar</p>
      </div>
    </div>
  );
}
