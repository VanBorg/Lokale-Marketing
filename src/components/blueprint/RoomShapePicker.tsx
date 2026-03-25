import { memo, useMemo } from 'react'
import type { ShapeType } from '../../utils/blueprintGeometry'
import { useTheme } from '../../hooks/useTheme'

interface RoomShapePickerProps {
  selected: ShapeType
  onSelect: (shape: ShapeType) => void
}

interface ShapeOption {
  id: ShapeType
  label: string
  path: string
}

// 6 preset shapes in een 3×2 grid
const SHAPES: ShapeOption[] = [
  {
    id: 'rechthoek',
    label: 'Vierkant',
    path: 'M4 4h24v24H4z',
  },
  {
    id: 'l-vorm',
    label: 'L-vorm',
    /** h13 i.p.v. h14: anders raakt de rechterrand x=32 en wordt de stroke door de viewBox afgeknipt. */
    path: 'M4 4h14v12h13v12H4z',
  },
  {
    id: 't-vorm',
    label: 'T-vorm',
    path: 'M4 4h24v8H18v16h-4V12H4z',
  },
  {
    id: 'u-vorm',
    label: 'U-vorm',
    path: 'M4 4h8v16h8V4h8v24H4z',
  },
  {
    id: 'i-vorm',
    label: 'I-vorm',
    path: 'M4 4h24v6H19v12h9v6H4v-6h9V10H4z',
  },
  {
    id: 'plus-vorm',
    label: 'Kruis',
    path: 'M11 4h10v7h7v10h-7v7H11v-7H4V11h7z',
  },
]

const ACCENT = '#35B4D3'

const RoomShapePicker = memo(function RoomShapePicker({ selected, onSelect }: RoomShapePickerProps) {
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const svgColors = useMemo(() => {
    if (isLight) {
      return {
        fillSelected: 'rgba(53,180,211,0.22)',
        fillIdle: 'rgba(15,23,42,0.06)',
        strokeSelected: ACCENT,
        strokeIdle: 'rgba(15,23,42,0.5)',
      }
    }
    return {
      fillSelected: 'rgba(53,180,211,0.2)',
      fillIdle: 'rgba(255,255,255,0.06)',
      strokeSelected: ACCENT,
      strokeIdle: 'rgba(255,255,255,0.45)',
    }
  }, [isLight])

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {SHAPES.map(s => {
        const isSelected = selected === s.id
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            title={s.label}
            className={[
              'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-150',
              'bg-dark hover:bg-dark-hover text-light/70 hover:text-light',
              isSelected
                ? 'border-accent text-accent shadow-[0_0_0_1px_#35B4D3]'
                : 'border-dark-border',
            ].join(' ')}
          >
            <svg
              viewBox="0 0 32 32"
              width={22}
              height={22}
              fill={isSelected ? svgColors.fillSelected : svgColors.fillIdle}
              stroke={isSelected ? svgColors.strokeSelected : svgColors.strokeIdle}
              strokeWidth={1.5}
              strokeLinejoin="round"
            >
              {s.id === 'i-vorm' || s.id === 'plus-vorm' ? (
                <g transform="translate(16,16) scale(1.18) translate(-16,-16)">
                  <path d={s.path} />
                </g>
              ) : (
                <path d={s.path} />
              )}
            </svg>
            <span className={`text-[9px] font-medium leading-none text-center truncate w-full ${isSelected ? 'text-accent' : ''}`}>
              {s.label}
            </span>
          </button>
        )
      })}
    </div>
  )
})

export default RoomShapePicker
