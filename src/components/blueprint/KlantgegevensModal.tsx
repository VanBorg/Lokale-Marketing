import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { Button, Input } from '../ui'
import type { Project } from '../../lib/database.types'

interface KlantgegevensModalProps {
  project: Project
  onSave: (updates: Partial<Project>) => void
  onClose: () => void
}

export default function KlantgegevensModal({ project, onSave, onClose }: KlantgegevensModalProps) {
  const [form, setForm] = useState({
    client_name: project.client_name ?? '',
    client_address: project.client_address ?? '',
    btw_nummer: project.btw_nummer ?? '',
    client_contact: project.client_contact ?? '',
    client_phone: project.client_phone ?? '',
    client_email: project.client_email ?? '',
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSave = useCallback(() => {
    onSave(form)
    onClose()
  }, [form, onSave, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-dark-card border border-dark-border rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-light">Klantgegevens</h2>
          <button
            onClick={onClose}
            className="ui-icon-button"
            aria-label="Sluiten"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <Input
            label="Naam"
            value={form.client_name}
            onChange={set('client_name')}
            placeholder="Volledige naam"
          />
          <Input
            label="Adres"
            value={form.client_address}
            onChange={set('client_address')}
            placeholder="Straat, huisnummer, stad"
          />
          <Input
            label="BTW-nummer"
            value={form.btw_nummer}
            onChange={set('btw_nummer')}
            placeholder="NL123456789B01"
          />
          <Input
            label="Contactpersoon"
            value={form.client_contact}
            onChange={set('client_contact')}
            placeholder="Voor- en achternaam"
          />
          <Input
            label="Telefoon"
            value={form.client_phone}
            onChange={set('client_phone')}
            placeholder="06-12345678"
          />
          <Input
            label="E-mail"
            type="email"
            value={form.client_email}
            onChange={set('client_email')}
            placeholder="naam@voorbeeld.nl"
          />
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" size="sm" onClick={onClose}>Annuleren</Button>
          <Button size="sm" onClick={handleSave}>Opslaan</Button>
        </div>
      </div>
    </div>
  )
}
