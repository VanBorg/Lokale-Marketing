import { useState, useCallback, useMemo, useEffect } from 'react'
import { blueprintStore, useRoom } from '../../store/blueprintStore'
import { generateShapeVertices, polygonArea, formatLength } from '../../utils/blueprintGeometry'
import type { Point, ShapeType } from '../../utils/blueprintGeometry'
import RoomShapePicker from './RoomShapePicker'
import ElementPicker from './ElementPicker'

const STEPS = ['Kamer', 'Elementen', 'Definitief maken'] as const

// ─── Step Kamer ───────────────────────────────────────────────────────────

interface StepKamerProps {
  onNext: (roomId: string) => void
  onPreviewChange?: (vertices: Point[]) => void
}

function StepKamer({ onNext, onPreviewChange }: StepKamerProps) {
  const [shape, setShape] = useState<ShapeType>('rechthoek')
  const [roomWidth, setRoomWidth] = useState(400)
  const [roomDepth, setRoomDepth] = useState(300)
  const [roomName, setRoomName] = useState('')
  const [wallHeight, setWallHeight] = useState(250)

  const previewVertices = useMemo(
    () => (shape === 'vrije-vorm' ? [] : generateShapeVertices(shape, roomWidth, roomDepth)),
    [shape, roomWidth, roomDepth],
  )

  // Propagate live preview to parent (BlueprintPage preview column)
  useEffect(() => {
    onPreviewChange?.(previewVertices)
  }, [previewVertices, onPreviewChange])

  const handlePlace = useCallback(() => {
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
    <div className="space-y-3">
      <RoomShapePicker selected={shape} onSelect={setShape} />

      {shape === 'vrije-vorm' ? (
        <p className="text-[11px] text-accent/80 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
          Klik op de canvas om punten te plaatsen. Dubbelklik om de vorm te sluiten.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="ui-label">Breedte (cm)</span>
              <input type="number" className="ui-input text-sm py-1.5" value={roomWidth} min={50} max={5000}
                onChange={e => setRoomWidth(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="ui-label">Diepte (cm)</span>
              <input type="number" className="ui-input text-sm py-1.5" value={roomDepth} min={50} max={5000}
                onChange={e => setRoomDepth(Number(e.target.value))} />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="ui-label">Naam ruimte</span>
            <input type="text" className="ui-input text-sm py-1.5" value={roomName} placeholder="bijv. Woonkamer"
              onChange={e => setRoomName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="ui-label">Wandhoogte (cm)</span>
            <input type="number" className="ui-input text-sm py-1.5" value={wallHeight} min={100} max={600}
              onChange={e => setWallHeight(Number(e.target.value))} />
          </label>
        </>
      )}

      <button
        onClick={handlePlace}
        disabled={shape === 'vrije-vorm'}
        className="w-full mt-1 px-4 py-2 text-sm bg-accent text-white font-semibold rounded-lg
          hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Plaatsen op plattegrond ↓
      </button>
    </div>
  )
}

// ─── Step Elementen ───────────────────────────────────────────────────────

function StepElementen() {
  return (
    <div>
      <ElementPicker />
    </div>
  )
}

// ─── Step Definitief maken ────────────────────────────────────────────────

interface StepDefinitiefProps {
  roomId: string | null
  onPrev: () => void
  onFinalize: () => void
}

function StepDefinitiefMaken({ roomId, onPrev, onFinalize }: StepDefinitiefProps) {
  const room = useRoom(roomId ?? '')

  if (!room) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-light/40">Geen kamer geconfigureerd.</p>
        <button onClick={onPrev} className="text-xs text-light/50 hover:text-light transition-colors">
          ← Vorige stap
        </button>
      </div>
    )
  }

  const area = polygonArea(room.vertices)

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="bg-dark rounded-lg border border-dark-border p-3 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-light/50">Naam</span>
          <span className="text-light font-medium">{room.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-light/50">Oppervlakte</span>
          <span className="text-light">{(area / 10000).toFixed(2)} m²</span>
        </div>
        <div className="flex justify-between">
          <span className="text-light/50">Wandhoogte</span>
          <span className="text-light">{formatLength(room.wallHeight)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-light/50">Vorm</span>
          <span className="text-light capitalize">{room.shape ?? '–'}</span>
        </div>
      </div>

      {/* Info */}
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 text-xs text-light/60">
        <p className="font-medium text-accent mb-1">Wat gebeurt er hierna?</p>
        <p>
          De kamer wordt opgeslagen op de plattegrond. Via de andere tabbladen kun je daarna
          werken met materiaallijsten, urenstaten, offertes en contracten.
        </p>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <button
          onClick={onFinalize}
          className="w-full px-4 py-2 text-sm bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-colors"
        >
          ✓ Kamer definitief maken
        </button>
        <button
          onClick={onPrev}
          className="w-full px-4 py-1.5 text-xs text-light/40 hover:text-light transition-colors"
        >
          ← Vorige stap
        </button>
      </div>

      <div className="pt-2 border-t border-dark-border">
        <button
          onClick={onFinalize}
          className="w-full px-4 py-1.5 text-xs border border-dark-border rounded-lg text-light/50
            hover:text-light hover:border-accent/50 transition-colors"
        >
          + Nieuwe kamer toevoegen
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
        'w-full flex items-center justify-between px-3 py-2 text-left transition-colors duration-150',
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

interface BuilderPanelProps {
  onPreviewChange?: (vertices: Point[]) => void
}

export default function BuilderPanel({ onPreviewChange }: BuilderPanelProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [lastRoomId, setLastRoomId] = useState<string | null>(null)

  const goPrev = useCallback(() => {
    setActiveStep(prev => Math.max(prev - 1, 0))
  }, [])

  // When a room is placed (step 1 "Volgende"), mark steps 0 + 1 complete so
  // the user can jump freely to "Elementen" or "Definitief maken" via headers.
  const handleStepKamerNext = useCallback((roomId: string) => {
    setLastRoomId(roomId)
    setCompletedSteps(prev => {
      const next = [...prev]
      if (!next.includes(0)) next.push(0)
      if (!next.includes(1)) next.push(1)
      return next
    })
    setActiveStep(1)
  }, [])

  const handleFinalize = useCallback(() => {
    setActiveStep(0)
    setCompletedSteps([])
    setLastRoomId(null)
    blueprintStore.getState().clearSelection()
  }, [])

  return (
    <div className="flex flex-col min-h-full bg-dark-card">
      {/* Header */}
      <div className="px-3 py-2 border-b border-dark-border">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-light/40">
          Bouwer
        </h2>
      </div>

      {/* Accordion steps */}
      {STEPS.map((step, index) => {
        const isActive = activeStep === index
        const isCompleted = completedSteps.includes(index)
        // "Definitief maken" (step 2) is unlocked as soon as step 0 is done
        const isLocked = index === 2
          ? !completedSteps.includes(0)
          : index > activeStep && !isCompleted

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

            <div
              className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
              style={{ maxHeight: isActive ? '1200px' : '0px' }}
            >
              <div className="px-3 pb-3 pt-1.5">
                {index === 0 && (
                  <StepKamer onNext={handleStepKamerNext} onPreviewChange={onPreviewChange} />
                )}
                {index === 1 && <StepElementen />}
                {index === 2 && (
                  <StepDefinitiefMaken
                    roomId={lastRoomId}
                    onPrev={goPrev}
                    onFinalize={handleFinalize}
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
