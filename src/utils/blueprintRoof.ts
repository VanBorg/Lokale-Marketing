import { polygonArea, getPerimeter } from './blueprintGeometry'
import type { Point } from './blueprintGeometry'

// ─── Roof types ───────────────────────────────────────────────────────────────

export type RoofType =
  | 'geen'
  | 'plat'
  | 'schuin-enkel'
  | 'zadeldak'
  | 'schilddak'
  | 'mansardedak'
  | 'platband'

export interface RoofCalculation {
  type: RoofType
  wallHeight: number
  peakHeight: number
  pitch?: number
  floorAreaM2: number
  roofAreaM2: number
  totalVolumeM3: number
  gevelAreaM2: number
}

/**
 * Calculate roof area, volume and facade area based on roof type.
 * peakHeight = extra height above the wall top (cm).
 */
export function calculateRoof(
  vertices: Point[],
  wallHeight: number,
  roofType: RoofType,
  peakHeight: number,
  pitch?: number,
): RoofCalculation {
  const floorAreaM2 = polygonArea(vertices) / 10000
  const perimeter = getPerimeter(vertices) / 100

  let roofAreaM2 = floorAreaM2
  let totalVolumeM3 = floorAreaM2 * (wallHeight / 100)
  let gevelAreaM2 = perimeter * (wallHeight / 100)

  switch (roofType) {
    case 'geen':
      roofAreaM2 = 0
      totalVolumeM3 = floorAreaM2 * (wallHeight / 100)
      break

    case 'plat':
    case 'platband':
      roofAreaM2 = floorAreaM2
      totalVolumeM3 = floorAreaM2 * (wallHeight / 100)
      break

    case 'schuin-enkel': {
      const breedte = Math.sqrt(floorAreaM2)
      const hellingsLen = Math.sqrt(breedte * breedte + (peakHeight / 100) * (peakHeight / 100))
      const ratio = hellingsLen / (breedte || 1)
      roofAreaM2 = floorAreaM2 * ratio
      totalVolumeM3 = floorAreaM2 * (wallHeight / 100) + (floorAreaM2 * (peakHeight / 100)) / 2
      break
    }

    case 'zadeldak': {
      const breedte = Math.sqrt(floorAreaM2)
      const halfBreedte = breedte / 2
      const hellingsLen = Math.sqrt(halfBreedte * halfBreedte + (peakHeight / 100) * (peakHeight / 100))
      const ratio = hellingsLen / (halfBreedte || 1)
      roofAreaM2 = floorAreaM2 * ratio
      totalVolumeM3 = floorAreaM2 * (wallHeight / 100) + (floorAreaM2 * (peakHeight / 100)) / 2
      const triangleArea = (breedte * (peakHeight / 100)) / 2
      gevelAreaM2 += triangleArea * 2
      break
    }

    case 'schilddak':
      roofAreaM2 = floorAreaM2 * 1.3
      totalVolumeM3 = floorAreaM2 * (wallHeight / 100) + (floorAreaM2 * (peakHeight / 100)) / 3
      break

    case 'mansardedak':
      roofAreaM2 = floorAreaM2 * 1.5
      totalVolumeM3 = floorAreaM2 * (wallHeight / 100) + (floorAreaM2 * (peakHeight / 100)) * 0.6
      break
  }

  return {
    type: roofType,
    wallHeight,
    peakHeight: wallHeight + peakHeight,
    pitch,
    floorAreaM2:   Math.round(floorAreaM2   * 100) / 100,
    roofAreaM2:    Math.round(roofAreaM2    * 100) / 100,
    totalVolumeM3: Math.round(totalVolumeM3 * 100) / 100,
    gevelAreaM2:   Math.round(gevelAreaM2   * 100) / 100,
  }
}
