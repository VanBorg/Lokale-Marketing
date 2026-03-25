import { useState, useCallback } from 'react'
import type { Point } from '../../utils/blueprintGeometry'
import StepKamerForm from './StepKamerForm'
import StepPlafond from './steps/StepPlafond'
import StepOpeningen from './steps/StepOpeningen'
import StepEtages from './steps/StepEtages'
import StepSamenvatting from './steps/StepSamenvatting'
import StepWanden from './steps/StepWanden'
import StepVloer from './steps/StepVloer'

const STEPS = [
  'Kamer',
  'Wanden',
  'Vloer',
  'Plafond',
  'Openingen',
  'Etages',
  'Samenvatting',
] as const

const LAST_STEP_INDEX = STEPS.length - 1

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

  const handleStepNext = useCallback((fromIndex: number) => {
    setCompletedSteps(prev => {
      const next = [...prev]
      if (!next.includes(fromIndex)) next.push(fromIndex)
      return next
    })
    setActiveStep(Math.min(fromIndex + 1, LAST_STEP_INDEX))
  }, [])

  const handleFinalize = useCallback(() => {
    setCompletedSteps(prev => {
      const next = [...prev]
      if (!next.includes(LAST_STEP_INDEX)) next.push(LAST_STEP_INDEX)
      return next
    })
  }, [])

  const handleWandenNext = useCallback(() => {
    setCompletedSteps(prev => prev.includes(1) ? prev : [...prev, 1])
    setActiveStep(2)
  }, [])

  const handleVloerNext = useCallback(() => {
    setCompletedSteps(prev => prev.includes(2) ? prev : [...prev, 2])
    setActiveStep(3)
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
        const isLocked = index === LAST_STEP_INDEX
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
                  <div data-last-room-id={lastRoomId ?? undefined}>
                    <StepKamerForm
                      onNext={handleStepKamerNext}
                      onPreviewChange={onPreviewChange}
                      controlledWidth={previewWidth}
                      controlledDepth={previewDepth}
                      onWidthChange={onWidthChange}
                      onDepthChange={onDepthChange}
                    />
                  </div>
                )}
                {index === 1 && (
                  <StepWanden
                    roomId={lastRoomId}
                    onNext={handleWandenNext}
                    onPrev={goPrev}
                  />
                )}
                {index === 2 && (
                  <StepVloer
                    roomId={lastRoomId}
                    onNext={handleVloerNext}
                    onPrev={goPrev}
                  />
                )}
                {index === 3 && (
                  <StepPlafond
                    roomId={lastRoomId}
                    onNext={() => handleStepNext(3)}
                    onPrev={goPrev}
                  />
                )}
                {index === 4 && (
                  <StepOpeningen
                    roomId={lastRoomId}
                    onNext={() => handleStepNext(4)}
                    onPrev={goPrev}
                  />
                )}
                {index === 5 && (
                  <StepEtages
                    onNext={() => handleStepNext(5)}
                    onPrev={goPrev}
                  />
                )}
                {index === 6 && (
                  <StepSamenvatting
                    roomId={lastRoomId}
                    onFinalize={handleFinalize}
                    onPrev={goPrev}
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
