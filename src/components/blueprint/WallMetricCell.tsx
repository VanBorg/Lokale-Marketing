import { useEffect, useRef, useState } from 'react'
import { formatNlDecimal } from '../../utils/blueprintGeometry'

interface WallMetricCellProps {
  wallIndex: number
  /** Wandlengte in centimeters (brondata). */
  lengthCm: number
  isActive: boolean
  /** Softer highlight when this wall is hovered on the preview canvas. */
  isCanvasHovered?: boolean
  /** Teruggeven in centimeters (store blijft cm). */
  onLengthChange: (valueCm: number) => void
  onHoverStart?: () => void
  /** Single lock: both position and length are frozen when true. */
  locked: boolean
  onToggleLock: () => void
}

export default function WallMetricCell({
  wallIndex,
  lengthCm,
  isActive,
  isCanvasHovered = false,
  onLengthChange,
  onHoverStart,
  locked,
  onToggleLock,
}: WallMetricCellProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isActive && cellRef.current) {
      cellRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isActive])

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(null)
  }, [lengthCm])

  const metersDisplay = formatNlDecimal(lengthCm / 100, 2)

  const commitDraft = () => {
    if (locked) return
    const raw = (draft ?? '').trim()
    if (raw === '') { setDraft(null); return }
    const meters = parseFloat(raw.replace(',', '.'))
    if (Number.isNaN(meters) || meters < 0.1) { setDraft(null); return }
    onLengthChange(Math.max(10, Math.round(meters * 100)))
    setDraft(null)
  }

  const displayValue = draft !== null ? draft : metersDisplay

  return (
    <div
      ref={cellRef}
      role="group"
      aria-label={`Wand ${wallIndex + 1}, ${metersDisplay} m${locked ? ' (vergrendeld)' : ''}`}
      onMouseEnter={onHoverStart}
      className={[
        'bg-dark px-1.5 py-0.5 min-h-0 flex flex-nowrap items-center justify-center gap-1 min-w-0 transition-all duration-200 cursor-default border border-transparent',
        locked ? 'opacity-90' : '',
        isActive
          ? 'ring-1 ring-inset ring-accent/40 bg-accent/[0.06]'
          : isCanvasHovered
            ? 'bg-accent/[0.04] border-accent/20'
            : 'hover:bg-light/[0.06] hover:border-light/15',
      ].join(' ')}
    >
      {/* Single lock button */}
      <button
        type="button"
        title={locked ? 'Ontgrendel wand — slepen en aanpassen weer mogelijk' : 'Vergrendel wand — positie en lengte blijven vast'}
        onClick={e => { e.stopPropagation(); onToggleLock() }}
        className={[
          'flex items-center justify-center gap-0.5 px-1 py-0 rounded border transition-all duration-200 h-10 min-w-[1.75rem] w-[1.75rem] shrink-0',
          locked
            ? 'border-orange-500/50 text-orange-400 bg-orange-500/10'
            : 'border-dark-border text-light/40 hover:border-orange-500/50 hover:text-orange-400/90 hover:bg-orange-500/5',
        ].join(' ')}
      >
        <span className="text-[11px] leading-none">{locked ? '🔒' : '🔓'}</span>
      </button>

      {/* Length input */}
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        readOnly={locked}
        title={locked ? undefined : 'Lengte in meters (bijv. 1,12) — Enter om toe te passen'}
        className={[
          'ui-input text-xs py-0 h-6 min-w-[3.25rem] w-[3.25rem] text-center tabular-nums px-0.5 shrink-0',
          locked ? 'cursor-not-allowed opacity-70 text-orange-400/80' : 'font-medium',
        ].join(' ')}
        value={displayValue}
        onClick={e => e.stopPropagation()}
        onFocus={() => { if (!locked) setDraft(metersDisplay) }}
        onChange={e => { if (locked) return; setDraft(e.target.value) }}
        onBlur={() => { setDraft(null) }}
        onKeyDown={e => {
          if (locked) return
          e.stopPropagation()
          if (e.key === 'Enter') { e.preventDefault(); commitDraft(); inputRef.current?.blur() }
          else if (e.key === 'Escape') { e.preventDefault(); setDraft(null); inputRef.current?.blur() }
          else if (e.key === 'ArrowUp') {
            e.preventDefault()
            const fromDraftM = draft !== null ? parseFloat(draft.replace(',', '.')) : lengthCm / 100
            const curCm = Number.isNaN(fromDraftM) ? lengthCm : Math.round(fromDraftM * 100)
            setDraft(formatNlDecimal(Math.max(10, curCm + 5) / 100, 2))
          } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            const fromDraftM = draft !== null ? parseFloat(draft.replace(',', '.')) : lengthCm / 100
            const curCm = Number.isNaN(fromDraftM) ? lengthCm : Math.round(fromDraftM * 100)
            setDraft(formatNlDecimal(Math.max(10, curCm - 5) / 100, 2))
          }
        }}
      />
    </div>
  )
}
