import { FileCheck } from 'lucide-react';

export default function TabContract() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
        <FileCheck size={20} className="text-accent" />
      </div>
      <p className="text-sm font-medium text-light">Contract</p>
      <p className="text-xs text-light/40">Binnenkort beschikbaar</p>
    </div>
  );
}
