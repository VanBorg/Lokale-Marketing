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

const SHAPES: ShapeOption[] = [
  {
    id: 'rechthoek',
    label: 'Rechthoek',
    path: 'M4 4h24v16H4z',
  },
  {
    id: 'l-vorm',
    label: 'L-vorm',
    path: 'M4 4h14v10h10v10H4z',
  },
  {
    id: 't-vorm',
    label: 'T-vorm',
    path: 'M4 4h24v8H18v12h-4V12H4z',
  },
  {
    id: 'u-vorm',
    label: 'U-vorm',
    path: 'M4 4h8v16h8V4h8v24H4z',
  },
  {
    id: 'plus-vorm',
    label: 'Plus',
    path: 'M11 4h10v7h7v10h-7v7H11v-7H4V11h7z',
  },
  {
    id: 'trapezium',
    label: 'Trapezium',
    path: 'M8 4h16l4 20H4z',
  },
  {
    id: 'zeshoek',
    label: 'Zeshoek',
    path: 'M16 2 l12 7 v14 l-12 7 l-12 -7 V9z',
  },
  {
    id: 'vrije-vorm',
    label: 'Vrij tekenen',
    path: 'M4 20 Q8 4 16 6 Q24 8 28 20 Q24 28 16 26 Q8 28 4 20z',
  },
]

const RoomShapePicker = memo(function RoomShapePicker({ selected, onSelect }: RoomShapePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SHAPES.map(s => {
        const isSelected = selected === s.id
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={[
              'flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all duration-150',
              'bg-dark hover:bg-dark-hover text-light/70 hover:text-light',
              isSelected
                ? 'border-accent text-accent shadow-[0_0_0_1px_#35B4D3]'
                : 'border-dark-border',
            ].join(' ')}
          >
            <svg
              viewBox="0 0 32 32"
              width={32}
              height={32}
              fill={isSelected ? 'rgba(53,180,211,0.2)' : 'rgba(255,255,255,0.06)'}
              stroke={isSelected ? '#35B4D3' : 'rgba(255,255,255,0.4)'}
              strokeWidth={1.5}
              strokeLinejoin="round"
            >
              <path d={s.path} />
            </svg>
            <span className={`text-[10px] font-medium leading-none ${isSelected ? 'text-accent' : ''}`}>
              {s.label}
            </span>
          </button>
        )
      })}
    </div>
  )
})

export default RoomShapePicker
