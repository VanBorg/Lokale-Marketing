import { memo } from 'react'
import { Line } from 'react-konva'
import type { SnapGuide } from '../../store/blueprintStore'

interface SnapGuidesProps {
  guides: SnapGuide[]
}

const SnapGuides = memo(function SnapGuides({ guides }: SnapGuidesProps) {
  return (
    <>
      {guides.map((g, i) => (
        <Line
          key={i}
          points={g.points}
          stroke="#35B4D3"
          strokeWidth={1}
          dash={[4, 4]}
          opacity={0.7}
          listening={false}
        />
      ))}
    </>
  )
})

export default SnapGuides
