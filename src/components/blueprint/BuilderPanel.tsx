import { useState, useCallback, useEffect, useRef } from 'react'
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
        'flex w-full items-center justify-between px-3 py-2 text-left transition-colors duration-150',
        isActive
          ? 'border-l-2 border-accent bg-accent/10 text-accent theme-light:bg-accent/[0.12]'
          : isCompleted
          ? 'cursor-pointer border-l-2 border-transparent text-neutral-400 hover:text-neutral-200 theme-light:text-neutral-800 theme-light:hover:text-neutral-950'
          : 'cursor-not-allowed border-l-2 border-transparent text-neutral-500/55 theme-light:text-neutral-400',
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <span
          className={[
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            isActive
              ? 'bg-accent text-white'
              : isCompleted
              ? 'bg-accent/25 text-accent'
              : 'bg-neutral-700 text-neutral-400 theme-light:bg-neutral-200 theme-light:text-neutral-600',
          ].join(' ')}
        >
          {isCompleted && !isActive ? '✓' : index + 1}
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      {!isLocked && (
        <svg
          className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden
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
  /** Updates preview from canvas (drag/rotate); keeps canvas-edited flag. */
  onCanvasPreviewChange?: (vertices: Point[]) => void
  canvasPreviewEdited?: boolean
  previewWidth?: number
  previewDepth?: number
  onWidthChange?: (w: number) => void
  onDepthChange?: (d: number) => void
  onActiveStepChange?: (step: number) => void
  parentPreviewVertices?: Point[]
  /** Room currently selected on the plattegrond; drives edit mode. */
  selectedRoomId?: string | null
}

export default function BuilderPanel({
  onPreviewChange,
  onCanvasPreviewChange,
  canvasPreviewEdited,
  previewWidth,
  previewDepth,
  onWidthChange,
  onDepthChange,
  onActiveStepChange,
  parentPreviewVertices,
  selectedRoomId,
}: BuilderPanelProps) {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    onActiveStepChange?.(activeStep)
  }, [activeStep, onActiveStepChange])
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [lastRoomId, setLastRoomId] = useState<string | null>(null)
  const [isEditingExisting, setIsEditingExisting] = useState(false)
  const [currentPreviewVertices, setCurrentPreviewVertices] = useState<Point[]>([])

  // Refs to read latest values without causing effect re-runs
  const lastRoomIdRef = useRef<string | null>(null)
  lastRoomIdRef.current = lastRoomId
  const isEditingExistingRef = useRef(false)
  isEditingExistingRef.current = isEditingExisting
  /** Set by handleStepKamerNext to prevent the selectedRoomId effect from overriding the placement flow. */
  const justPlacedIdRef = useRef<string | null>(null)

  // ─── Sync canvas selection → builder ──────────────────────────────────
  useEffect(() => {
    if (!selectedRoomId) {
      // Selection cleared while editing → reset to new-room mode
      if (isEditingExistingRef.current) {
        setIsEditingExisting(false)
        setLastRoomId(null)
        setCompletedSteps([])
        setActiveStep(0)
      }
      return
    }

    // Ignore the select([id]) that happens immediately after placement
    if (selectedRoomId === justPlacedIdRef.current) {
      justPlacedIdRef.current = null
      return
    }

    // Already in edit mode for this exact room — no change needed.
    // (Only skip when isEditingExisting is true; if it's false the room was just
    // placed and not yet in edit mode, so we must still switch over.)
    if (selectedRoomId === lastRoomIdRef.current && isEditingExistingRef.current) return

    // New or previously-placed room selected → load it into the builder
    setLastRoomId(selectedRoomId)
    setIsEditingExisting(true)
    setCompletedSteps([0, 1, 2, 3, 4, 5])
    setActiveStep(0)
  }, [selectedRoomId])

  const handlePreviewChange = useCallback((vertices: Point[]) => {
    setCurrentPreviewVertices(vertices)
    onPreviewChange?.(vertices)
  }, [onPreviewChange])

  const handleCanvasPreviewChange = useCallback((vertices: Point[]) => {
    setCurrentPreviewVertices(vertices)
    onCanvasPreviewChange?.(vertices)
  }, [onCanvasPreviewChange])

  const goPrev = useCallback(() => {
    setActiveStep(prev => Math.max(prev - 1, 0))
  }, [])

  const handleStepKamerNext = useCallback((roomId: string) => {
    // Mark as just-placed so the selectedRoomId effect won't trigger edit mode
    justPlacedIdRef.current = roomId
    setLastRoomId(roomId)
    setIsEditingExisting(false)
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
    setCurrentPreviewVertices([])
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
    <div className="flex min-h-full flex-col bg-dark-card theme-light:bg-white">
      <div className="border-b border-dark-border px-3 py-2 theme-light:border-neutral-200">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 theme-light:text-neutral-600">
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
          <div key={step} className="border-b border-dark-border theme-light:border-neutral-200">
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
                      onPreviewChange={handlePreviewChange}
                      onCanvasPreviewChange={handleCanvasPreviewChange}
                      canvasPreviewEdited={canvasPreviewEdited}
                      controlledWidth={previewWidth}
                      controlledDepth={previewDepth}
                      onWidthChange={onWidthChange}
                      onDepthChange={onDepthChange}
                      currentPreviewVertices={currentPreviewVertices}
                      parentPreviewVertices={parentPreviewVertices}
                      editRoomId={isEditingExisting ? lastRoomId : null}
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
