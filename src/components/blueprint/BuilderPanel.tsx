import { useState, useCallback } from 'react'
import { blueprintStore, useRoom } from '../../store/blueprintStore'
import { generateShapeVertices, polygonArea, formatLength } from '../../utils/blueprintGeometry'
import type { ShapeType } from '../../utils/blueprintGeometry'
import RoomShapePicker from './RoomShapePicker'
import ElementPicker from './ElementPicker'

const STEPS = ['Kamer', 'Elementen', 'Overzicht'] as const

// ─── Step sub-components ──────────────────────────────────────────────────

interface StepKamerProps {
  onNext: (roomId: string) => void
}

function StepKamer({ onNext }: StepKamerProps) {
  const [shape, setShape] = useState<ShapeType>('rechthoek')
  const [roomWidth, setRoomWidth] = useState(400)
  const [roomDepth, setRoomDepth] = useState(300)
  const [roomName, setRoomName] = useState('')
  const [wallHeight, setWallHeight] = useState(250)

  const handleNext = useCallback(() => {
    if (shape === 'vrije-vorm') {
      blueprintStore.getState().setActiveTool('draw')
      return
    }
    const vertices = generateShapeVertices(shape, roomWidth, roomDepth)
    if (vertices.length < 3) return
    const id = blueprintStore.getState().addRoom(vertices, {
      name: roomName || 'Ruimte',
      wallHeight,
      shape,
    })
    blueprintStore.getState().select([id])
    onNext(id)
  }, [shape, roomWidth, roomDepth, roomName, wallHeight, onNext])

  return (
    <div className="space-y-4">
      <RoomShapePicker selected={shape} onSelect={setShape} />

      {shape === 'vrije-vorm' ? (
        <p className="text-[11px] text-accent/80 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
          Klik op de canvas om punten te plaatsen. Dubbelklik om de vorm te sluiten.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="ui-label">Breedte (cm)</span>
              <input type="number" className="ui-input" value={roomWidth} min={50} max={5000}
                onChange={e => setRoomWidth(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="ui-label">Diepte (cm)</span>
              <input type="number" className="ui-input" value={roomDepth} min={50} max={5000}
                onChange={e => setRoomDepth(Number(e.target.value))} />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="ui-label">Naam ruimte</span>
            <input type="text" className="ui-input" value={roomName} placeholder="bijv. Woonkamer"
              onChange={e => setRoomName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="ui-label">Wandhoogte (cm)</span>
            <input type="number" className="ui-input" value={wallHeight} min={100} max={600}
              onChange={e => setWallHeight(Number(e.target.value))} />
          </label>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-white/10">
        <button
          onClick={handleNext}
          disabled={shape === 'vrije-vorm'}
          className="px-4 py-2 text-sm bg-accent text-white font-semibold rounded-lg
            hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors flex items-center gap-2"
        >
          Volgende →
        </button>
      </div>
    </div>
  )
}

// ─── Step Elementen ───────────────────────────────────────────────────────

interface StepElementenProps {
  onPrev: () => void
  onNext: () => void
}

function StepElementen({ onPrev, onNext }: StepElementenProps) {
  return (
    <div className="space-y-4">
      <ElementPicker />
      <div className="flex justify-between pt-2 border-t border-white/10">
        <button onClick={onPrev}
          className="px-4 py-2 text-sm text-light/60 hover:text-light transition-colors flex items-center gap-2">
          ← Vorige
        </button>
        <button onClick={onNext}
          className="px-4 py-2 text-sm bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-2">
          Volgende →
        </button>
      </div>
    </div>
  )
}

// ─── Step Overzicht ───────────────────────────────────────────────────────

interface StepOverzichtProps {
  roomId: string | null
  onPrev: () => void
  onSave: () => void
}

function StepOverzicht({ roomId, onPrev, onSave }: StepOverzichtProps) {
  const room = useRoom(roomId ?? '')

  if (!room) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-light/40">Geen kamer geconfigureerd.</p>
        <div className="flex justify-between pt-2 border-t border-white/10">
          <button onClick={onPrev}
            className="px-4 py-2 text-sm text-light/60 hover:text-light transition-colors">
            ← Vorige
          </button>
        </div>
      </div>
    )
  }

  const area = polygonArea(room.vertices)

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between py-1.5 border-b border-white/10">
          <span className="text-light/60">Naam</span>
          <span className="text-light font-medium">{room.name}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-white/10">
          <span className="text-light/60">Vorm</span>
          <span className="text-light capitalize">{room.shape ?? '–'}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-white/10">
          <span className="text-light/60">Oppervlakte</span>
          <span className="text-light">{(area / 10000).toFixed(2)} m²</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-white/10">
          <span className="text-light/60">Wandhoogte</span>
          <span className="text-light">{formatLength(room.wallHeight)}</span>
        </div>
        <div className="flex justify-between py-1.5">
          <span className="text-light/60">Hoekpunten</span>
          <span className="text-light">{room.vertices.length}</span>
        </div>
      </div>

      <div className="flex justify-between pt-2 border-t border-white/10">
        <button onClick={onPrev}
          className="px-4 py-2 text-sm text-light/60 hover:text-light transition-colors flex items-center gap-2">
          ← Vorige
        </button>
        <button onClick={onSave}
          className="px-4 py-2 text-sm bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-colors">
          Nieuwe kamer toevoegen
        </button>
      </div>
    </div>
  )
}

// ─── Accordion header ─────────────────────────────────────────────────────

interface AccordionHeaderProps {
  index: number
  label: string
  isActive: boolean
  isCompleted: boolean
  isLocked: boolean
  onClick: () => void
}

function AccordionHeader({ index, label, isActive, isCompleted, isLocked, onClick }: AccordionHeaderProps) {
  return (
    <button
      type="button"
      onClick={isLocked ? undefined : onClick}
      disabled={isLocked}
      className={[
        'w-full flex items-center justify-between px-4 py-3 text-left transition-colors duration-150',
        isActive
          ? 'text-white border-l-2 border-accent bg-accent/5'
          : isCompleted
          ? 'text-white/60 hover:text-white/80 border-l-2 border-transparent cursor-pointer'
          : 'text-white/30 cursor-not-allowed border-l-2 border-transparent',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <span className={[
          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
          isActive
            ? 'bg-accent text-white'
            : isCompleted
            ? 'bg-accent/20 text-accent'
            : 'bg-white/10 text-white/30',
        ].join(' ')}>
          {isCompleted && !isActive ? '✓' : index + 1}
        </span>
        <span className="font-medium text-sm">{label}</span>
      </div>
      {!isLocked && (
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────

export default function BuilderPanel() {
  const [activeStep, setActiveStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [lastRoomId, setLastRoomId] = useState<string | null>(null)

  const goNext = useCallback(() => {
    setCompletedSteps(prev => prev.includes(activeStep) ? prev : [...prev, activeStep])
    setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1))
  }, [activeStep])

  const goPrev = useCallback(() => {
    setActiveStep(prev => Math.max(prev - 1, 0))
  }, [])

  const handleStepKamerNext = useCallback((roomId: string) => {
    setLastRoomId(roomId)
    setCompletedSteps(prev => prev.includes(0) ? prev : [...prev, 0])
    setActiveStep(1)
  }, [])

  const handleSaveRoom = useCallback(() => {
    // Room already on canvas — just reset accordion for next room
    setActiveStep(0)
    setCompletedSteps([])
    setLastRoomId(null)
  }, [])

  return (
    <div className="flex flex-col min-h-full bg-dark-card">
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-border">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-light/40">
          Bouwer
        </h2>
      </div>

      {/* Accordion steps */}
      {STEPS.map((step, index) => {
        const isActive = activeStep === index
        const isCompleted = completedSteps.includes(index)
        const isLocked = index > activeStep && !isCompleted

        return (
          <div key={step} className="border-b border-dark-border">
            <AccordionHeader
              index={index}
              label={step}
              isActive={isActive}
              isCompleted={isCompleted}
              isLocked={isLocked}
              onClick={() => !isLocked && setActiveStep(index)}
            />

            <div className={[
              'overflow-hidden transition-all duration-300 ease-in-out',
              isActive ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0',
            ].join(' ')}>
              <div className="px-4 pb-4 pt-2">
                {index === 0 && (
                  <StepKamer onNext={handleStepKamerNext} />
                )}
                {index === 1 && (
                  <StepElementen onPrev={goPrev} onNext={goNext} />
                )}
                {index === 2 && (
                  <StepOverzicht
                    roomId={lastRoomId}
                    onPrev={goPrev}
                    onSave={handleSaveRoom}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
