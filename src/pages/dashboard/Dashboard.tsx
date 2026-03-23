import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import { ClipboardList, Archive } from 'lucide-react';

/** Startpagina met module-kaarten: Blauwdruk Maker en Archief */
export default function Dashboard() {
  const navigate = useNavigate();

  const modules = [
    {
      code: 'A1',
      name: 'Blauwdruk Maker',
      path: '/projects',
      description: 'Open je projecten en teken plattegronden per project.',
      icon: <ClipboardList size={24} />,
      selected: true,
    },
    {
      code: 'A2',
      name: 'Archief',
      path: '/archief',
      description: 'Bekijk en beheer opgeslagen blauwdrukken en offertes.',
      icon: <Archive size={24} />,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-light">Welkom bij Pixel Blueprint</h1>
        <p className="text-light/50 mt-1">Kies een module om te beginnen</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
        {modules.map(mod => (
          <Card
            key={mod.code}
            hover
            selected={mod.selected}
            onClick={() => navigate(mod.path)}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-accent/10 text-accent shrink-0">{mod.icon}</div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-light/40">{mod.code}</span>
                  <h3 className="text-sm font-semibold text-light">{mod.name}</h3>
                </div>
                <p className="text-xs text-light/50 leading-relaxed">{mod.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
