import { useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const DEFAULTS = {
  name: 'Renovatie Teststraat',
  clientName: 'Familie Jansen',
  clientAddress: 'Teststraat 1, Amsterdam',
  btwNummer: 'NL123456789B01',
  clientContact: 'Piet Jansen',
  clientPhone: '06-12345678',
  clientEmail: 'piet@jansen.nl',
};

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (values: {
    name: string;
    client_name: string;
    client_address: string;
    btw_nummer: string;
    client_contact: string;
    client_phone: string;
    client_email: string;
  }) => Promise<void>;
}

export default function NewProjectDialog({ open, onOpenChange, onCreate }: NewProjectDialogProps) {
  const [name, setName] = useState(DEFAULTS.name);
  const [clientName, setClientName] = useState(DEFAULTS.clientName);
  const [clientAddress, setClientAddress] = useState(DEFAULTS.clientAddress);
  const [btwNummer, setBtwNummer] = useState(DEFAULTS.btwNummer);
  const [clientContact, setClientContact] = useState(DEFAULTS.clientContact);
  const [clientPhone, setClientPhone] = useState(DEFAULTS.clientPhone);
  const [clientEmail, setClientEmail] = useState(DEFAULTS.clientEmail);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName(DEFAULTS.name);
    setClientName(DEFAULTS.clientName);
    setClientAddress(DEFAULTS.clientAddress);
    setBtwNummer(DEFAULTS.btwNummer);
    setClientContact(DEFAULTS.clientContact);
    setClientPhone(DEFAULTS.clientPhone);
    setClientEmail(DEFAULTS.clientEmail);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreate({
        name,
        client_name: clientName,
        client_address: clientAddress,
        btw_nummer: btwNummer,
        client_contact: clientContact,
        client_phone: clientPhone,
        client_email: clientEmail,
      });
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-xl bg-dark-card border border-dark-border p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold text-light">
              Nieuw Project
            </Dialog.Title>
            <Dialog.Close className="p-1 rounded-lg text-light/40 hover:text-light hover:bg-dark-hover transition-colors cursor-pointer">
              <X size={18} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input label="Projectnaam" value={name} onChange={e => setName(e.target.value)} required />
            <Input label="Klantnaam" value={clientName} onChange={e => setClientName(e.target.value)} />
            <Input label="Adres" value={clientAddress} onChange={e => setClientAddress(e.target.value)} />
            <Input label="BTW-nummer" value={btwNummer} onChange={e => setBtwNummer(e.target.value)} />
            <Input label="Contactpersoon" value={clientContact} onChange={e => setClientContact(e.target.value)} />
            <Input label="Telefoonnummer" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
            <Input label="E-mail" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={!name.trim() || saving}>
                {saving ? 'Opslaan...' : 'Aanmaken'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
