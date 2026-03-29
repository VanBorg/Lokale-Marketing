import { useState, useCallback, useEffect, useRef } from 'react'
import type { Point } from '../../utils/blueprintGeometry'
import { useBlueprintStore } from '../../store/blueprintStore'
import StepKamerForm from './StepKamerForm'
import StepPlafond from './steps/StepPlafond'
import StepOpeningen from './steps/StepOpeningen'
import StepEtages from './steps/StepEtages'
import StepSamenvatting from './steps/StepSamenvatting'
import StepWanden from './steps/StepWanden'
import StepVloer from './steps/StepVloer'
import StepElementen from './steps/StepElementen'

const STEPS = [
  'Kamer',
  'Elementen',
  'Wanden',
  'Vloer',
  'Plafond',
  'Openingen',
  'Etages',
  'Samenvatting',
] as const

const LAST_STEP_INDEX = STEPS.length - 1
/** Geen harmonica-open: geen kamer op plattegrond en geen actieve nieuwe-kamer-flow. */
const NO_ACTIVE_STEP = -1

function nextKamerName(
  order: string[],
  roomMap: Record<string, { name: string }>,
): string {
  const used = new Set(
    order.map(id => roomMap[id]?.name).filter((n): n is string => Boolean(n)),
  )
  let n = 1
  while (used.has(`Kamer${n}`)) n += 1
  return `Kamer${n}`
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
          className={`h-4 w-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${isActive ? 'rotate-180' : ''}`}
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
  /** Zelfde als Kamerkaart: kamer gekozen of “Nieuwe kamer” actief — anders harmonica dicht. */
  builderFlowActive: boolean
  /** Verhoog bij “Nieuwe kamer” om stap-voortgang en lastRoomId te resetten. */
  builderResetNonce?: number
  /** Start nieuwe kamer: selectie wissen + standaard preview (BlueprintPage). */
  onStartNewRoom?: () => void
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
  builderFlowActive,
  builderResetNonce = 0,
  onStartNewRoom,
}: BuilderPanelProps) {
  const roomOrder = useBlueprintStore(s => s.roomOrder)
  const rooms = useBlueprintStore(s => s.rooms)
  const [activeStep, setActiveStep] = useState(NO_ACTIVE_STEP)

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

  useEffect(() => {
    if (!builderFlowActive) {
      setActiveStep(NO_ACTIVE_STEP)
    }
  }, [builderFlowActive])

  // ─── Sync canvas selection → builder ──────────────────────────────────
  useEffect(() => {
    if (!selectedRoomId) {
      // Selection cleared while editing → geen open harmonica (geen kamer / geen nieuwe flow)
      if (isEditingExistingRef.current) {
        setIsEditingExisting(false)
        setLastRoomId(null)
        setCompletedSteps([])
        setActiveStep(NO_ACTIVE_STEP)
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
    setCompletedSteps([0, 1, 2, 3, 4, 5, 6])
    setActiveStep(0)
  }, [selectedRoomId])

  useEffect(() => {
    if (builderResetNonce === 0) return
    setActiveStep(0)
    setCompletedSteps([])
    setLastRoomId(null)
    setIsEditingExisting(false)
    setCurrentPreviewVertices([])
  }, [builderResetNonce])

  const handlePreviewChange = useCallback((vertices: Point[]) => {
    setCurrentPreviewVertices(vertices)
    onPreviewChange?.(vertices)
  }, [onPreviewChange])

  const handleCanvasPreviewChange = useCallback((vertices: Point[]) => {
    setCurrentPreviewVertices(vertices)
    onCanvasPreviewChange?.(vertices)
  }, [onCanvasPreviewChange])

  const goPrev = useCallback(() => {
    setActiveStep(prev => Math.max(prev - 1, NO_ACTIVE_STEP))
  }, [])

  const handleStepKamerNext = useCallback((roomId: string) => {
    // Mark as just-placed so the selectedRoomId effect won't trigger edit mode
    justPlacedIdRef.current = roomId
    setLastRoomId(roomId)
    setIsEditingExisting(false)
    setCompletedSteps(prev => {
      const next = [...prev]
      if (!next.includes(0)) next.push(0)
      return next
    })
    setActiveStep(1)
  }, [])

  const handleElementenNext = useCallback(() => {
    setCompletedSteps(prev => (prev.includes(1) ? prev : [...prev, 1]))
    setActiveStep(2)
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
    setCompletedSteps(prev => (prev.includes(2) ? prev : [...prev, 2]))
    setActiveStep(3)
  }, [])

  const handleVloerNext = useCallback(() => {
    setCompletedSteps(prev => (prev.includes(3) ? prev : [...prev, 3]))
    setActiveStep(4)
  }, [])

  return (
    <div className="flex min-h-full flex-col bg-dark-card theme-light:bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-dark-border px-3 py-2 theme-light:border-neutral-200">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 theme-light:text-neutral-600">
          Bouwer
        </h2>
        {onStartNewRoom && (
          <button
            type="button"
            onClick={onStartNewRoom}
            className="shrink-0 rounded-md border border-accent/35 bg-accent/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-accent transition-all duration-200 hover:border-accent/55 hover:bg-accent/15 theme-light:border-accent/40 theme-light:bg-accent/[0.12]"
          >
            Nieuwe kamer +
          </button>
        )}
      </div>

      {STEPS.map((step, index) => {
        const isActive = activeStep === index
        const isCompleted = completedSteps.includes(index)
        const isLocked =
          index === LAST_STEP_INDEX
            ? !completedSteps.includes(0)
            : activeStep === NO_ACTIVE_STEP
              ? true
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
              className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none motion-reduce:duration-0"
              style={{ gridTemplateRows: isActive ? '1fr' : '0fr' }}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="px-3 pb-3 pt-1.5">
                {index === 0 && activeStep !== NO_ACTIVE_STEP && (
                  <div data-last-room-id={lastRoomId ?? undefined}>
                    <StepKamerForm
                      key={isEditingExisting ? `edit-${lastRoomId}` : `new-${roomOrder.length}`}
                      defaultRoomName={nextKamerName(roomOrder, rooms)}
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
                  <StepElementen
                    roomId={lastRoomId}
                    onNext={handleElementenNext}
                    onPrev={goPrev}
                  />
                )}
                {index === 2 && (
                  <StepWanden
                    roomId={lastRoomId}
                    onNext={handleWandenNext}
                    onPrev={goPrev}
                  />
                )}
                {index === 3 && (
                  <StepVloer
                    roomId={lastRoomId}
                    onNext={handleVloerNext}
                    onPrev={goPrev}
                  />
                )}
                {index === 4 && (
                  <StepPlafond
                    roomId={lastRoomId}
                    onNext={() => handleStepNext(4)}
                    onPrev={goPrev}
                  />
                )}
                {index === 5 && (
                  <StepOpeningen
                    roomId={lastRoomId}
                    onNext={() => handleStepNext(5)}
                    onPrev={goPrev}
                  />
                )}
                {index === 6 && (
                  <StepEtages
                    onNext={() => handleStepNext(6)}
                    onPrev={goPrev}
                  />
                )}
                {index === 7 && (
                  <StepSamenvatting
                    roomId={lastRoomId}
                    onFinalize={handleFinalize}
                    onPrev={goPrev}
                  />
                )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
