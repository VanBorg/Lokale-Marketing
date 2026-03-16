import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import {
  FileText,
  Receipt,
  CalendarDays,
  Clock,
  ShoppingCart,
  Package,
  Truck,
  ShieldCheck,
} from 'lucide-react';
interface DashboardModule {
  code: string;
  name: string;
  description: string;
  path: string;
  group: 'A' | 'B';
  icon: React.ReactNode;
}

const modules: DashboardModule[] = [
  {
    code: 'A1', name: 'Offerte', group: 'A', path: '/a1-offerte',
    description: 'Maak professionele offertes met plattegronden en werkzaamheden.',
    icon: <FileText size={24} />,
  },
  {
    code: 'A2', name: 'Factuur', group: 'A', path: '/a2-factuur',
    description: 'Genereer facturen en beheer betalingen.',
    icon: <Receipt size={24} />,
  },
  {
    code: 'A3', name: 'Planning', group: 'A', path: '/a3-planning',
    description: 'Plan projecten, teams en deadlines.',
    icon: <CalendarDays size={24} />,
  },
  {
    code: 'A4', name: 'Urenregistratie', group: 'A', path: '/a4-uren',
    description: 'Registreer uren per medewerker en project.',
    icon: <Clock size={24} />,
  },
  {
    code: 'B1', name: 'Inkoop', group: 'B', path: '/b1-inkoop',
    description: 'Beheer inkooporders en leveranciers.',
    icon: <ShoppingCart size={24} />,
  },
  {
    code: 'B2', name: 'Voorraad', group: 'B', path: '/b2-voorraad',
    description: 'Houd voorraadniveaus en locaties bij.',
    icon: <Package size={24} />,
  },
  {
    code: 'B3', name: 'Materieel', group: 'B', path: '/b3-materieel',
    description: 'Beheer machines, voertuigen en gereedschap.',
    icon: <Truck size={24} />,
  },
  {
    code: 'B4', name: 'Kwaliteit', group: 'B', path: '/b4-kwaliteit',
    description: 'Kwaliteitscontroles en certificeringen.',
    icon: <ShieldCheck size={24} />,
  },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-light">Welkom bij Craftbase</h1>
        <p className="text-light/50 mt-1">
          Kies een module om te beginnen
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules.map((mod) => (
          <Card
            key={mod.code}
            hover
            onClick={() => navigate(mod.path)}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-accent/10 text-accent shrink-0">
                {mod.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-light/40">{mod.code}</span>
                  <h3 className="text-sm font-semibold text-light">{mod.name}</h3>
                </div>
                <p className="text-xs text-light/50 leading-relaxed">
                  {mod.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
