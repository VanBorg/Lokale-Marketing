import { memo } from 'react'
import type { ShapeType } from '../../utils/blueprintGeometry'

interface RoomShapePickerProps {
  selected: ShapeType
  onSelect: (shape: ShapeType) => void
}

interface ShapeOption {
  id: ShapeType
  label: string
  path: string
}

// 8 shapes in a 4×2 grid — the most commonly used floor plan shapes
const SHAPES: ShapeOption[] = [
  {
    id: 'rechthoek',
    label: 'Vierkant',
    path: 'M4 4h24v24H4z',
  },
  {
    id: 'l-vorm',
    label: 'L-vorm',
    path: 'M4 4h14v12h14v12H4z',
  },
  {
    id: 'l-omgekeerd',
    label: 'L omgek.',
    path: 'M28 4H14v12H4v12h24z',
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
  {
    id: 'vrije-vorm',
    label: 'Vrij',
    // hammer icon
    path: 'M18 4h10v8H20L8 28H4L16 12V4z',
  },
]

const RoomShapePicker = memo(function RoomShapePicker({ selected, onSelect }: RoomShapePickerProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
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
              fill={isSelected ? 'rgba(53,180,211,0.2)' : 'rgba(255,255,255,0.06)'}
              stroke={isSelected ? '#35B4D3' : 'rgba(255,255,255,0.4)'}
              strokeWidth={1.5}
              strokeLinejoin="round"
            >
              <path d={s.path} />
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
