import { useState, useCallback } from 'react'
import { blueprintStore, useRoom } from '../../store/blueprintStore'
import {
  polygonArea,
  formatLength,
  getPerimeter,
  calculateRoof,
  wallLength,
  wallAngle,
} from '../../utils/blueprintGeometry'
import type { Point } from '../../utils/blueprintGeometry'
import ElementPicker from './ElementPicker'
import StepKamerForm from './StepKamerForm'

const STEPS = ['Kamer', 'Elementen', 'Definitief maken'] as const

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

  const floorAreaM2 = polygonArea(room.vertices) / 10000
  const perimeterM  = getPerimeter(room.vertices) / 100
  const roofCalc    = calculateRoof(
    room.vertices,
    room.wallHeight,
    room.roofType ?? 'plat',
    room.roofPeakHeight ?? 0,
  )

  const summaryRows = [
    { label: 'Vloeroppervlak',  value: `${floorAreaM2.toFixed(2)} m²`,               accent: true },
    { label: 'Omtrek',          value: `${perimeterM.toFixed(2)} m` },
    { label: 'Wandhoogte',      value: formatLength(room.wallHeight) },
    { label: 'Geveloppervlak',  value: `${roofCalc.gevelAreaM2.toFixed(2)} m²` },
    { label: 'Dakoppervlak',    value: `${roofCalc.roofAreaM2.toFixed(2)} m²` },
    { label: 'Daktype',         value: room.roofType ?? 'plat' },
    { label: 'Volume ruimte',   value: `${roofCalc.totalVolumeM3.toFixed(2)} m³` },
    { label: 'Hoogste punt',    value: formatLength(roofCalc.peakHeight) },
    { label: 'Aantal wanden',   value: `${room.vertices.length}` },
  ]

  return (
    <div className="space-y-3">
      {/* Technical summary table */}
      <div className="bg-dark rounded-lg border border-dark-border overflow-hidden">
        <div className="px-3 py-2 border-b border-dark-border bg-dark-hover">
          <span className="text-[10px] font-bold uppercase tracking-wider text-light/40">
            Technische afmetingen
          </span>
        </div>
        <div className="divide-y divide-dark-border/50">
          {summaryRows.map(row => (
            <div key={row.label} className="flex justify-between px-3 py-1.5 text-xs">
              <span className="text-light/50">{row.label}</span>
              <span className={row.accent ? 'text-accent font-bold' : 'text-light font-medium'}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-wall breakdown */}
      <div className="bg-dark rounded-lg border border-dark-border overflow-hidden">
        <div className="px-3 py-2 border-b border-dark-border bg-dark-hover">
          <span className="text-[10px] font-bold uppercase tracking-wider text-light/40">
            Wanden
          </span>
        </div>
        <div className="divide-y divide-dark-border/50 max-h-48 overflow-y-auto">
          {room.vertices.map((v, i) => {
            const next = room.vertices[(i + 1) % room.vertices.length]
            const len     = wallLength(v, next)
            const ang     = wallAngle(v, next)
            const isLocked = room.lockedWalls?.includes(i)
            const wandM2  = (len / 100) * (room.wallHeight / 100)
            return (
              <div key={i} className="flex items-center px-3 py-1.5 text-xs gap-2">
                <span className="text-light/30 w-12 shrink-0">Wand {i + 1}</span>
                <span className="text-light flex-1">{formatLength(len)}</span>
                <span className="text-light/40">{ang.toFixed(0)}°</span>
                <span className="text-light/40">{wandM2.toFixed(2)} m²</span>
                {isLocked && <span className="text-amber-400 text-[9px]">🔒</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Future modules banner */}
      <div className="bg-accent/5 border border-accent/20 rounded-lg p-3 text-xs text-light/60 space-y-1">
        <p className="font-medium text-accent">Beschikbaar na definitief maken:</p>
        <p>• Materiaallijst o.b.v. wand- en vloeroppervlak</p>
        <p>• Urenstaat koppelen aan m²</p>
        <p>• Offerte genereren met berekende hoeveelheden</p>
      </div>

      <button
        onClick={onFinalize}
        className="w-full px-4 py-2.5 text-sm bg-accent text-white font-bold rounded-lg hover:bg-accent/90 transition-colors"
      >
        ✓ Kamer definitief maken
      </button>
      <button
        onClick={onPrev}
        className="w-full px-4 py-1.5 text-xs text-light/40 hover:text-light transition-colors"
      >
        ← Vorige stap
      </button>

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
  previewWidth?: number
  previewDepth?: number
  onWidthChange?: (w: number) => void
  onDepthChange?: (d: number) => void
}

export default function BuilderPanel({ onPreviewChange, previewWidth, previewDepth, onWidthChange, onDepthChange }: BuilderPanelProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [lastRoomId, setLastRoomId] = useState<string | null>(null)

  const goPrev = useCallback(() => {
    setActiveStep(prev => Math.max(prev - 1, 0))
  }, [])

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
      <div className="px-3 py-2 border-b border-dark-border">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-light/40">
          Bouwer
        </h2>
      </div>

      {STEPS.map((step, index) => {
        const isActive = activeStep === index
        const isCompleted = completedSteps.includes(index)
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
              style={{ maxHeight: isActive ? '1400px' : '0px' }}
            >
              <div className="px-3 pb-3 pt-1.5">
                {index === 0 && (
                  <StepKamerForm
                    onNext={handleStepKamerNext}
                    onPreviewChange={onPreviewChange}
                    controlledWidth={previewWidth}
                    controlledDepth={previewDepth}
                    onWidthChange={onWidthChange}
                    onDepthChange={onDepthChange}
                  />
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
