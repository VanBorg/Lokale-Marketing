export interface OriginCrossPalette {
  underlay: string
  mid: string
  main: string
  shadow: string
  centreFill: string
  centreStroke: string
  ring: string
  ringOpacity: number
  swUnder: number
  swMid: number
  swMain: number
  shadowBlur: number
  swCentre: number
  swRing: number
}

export function getOriginCrossPalette(isLight: boolean): OriginCrossPalette {
  return isLight
    ? {
        underlay: 'rgba(14,116,144,0.42)',
        mid: 'rgba(8,95,120,0.55)',
        main: '#0e7490',
        shadow: 'rgba(14,116,144,0.55)',
        centreFill: '#1e293b',
        centreStroke: '#0891b2',
        ring: '#0e7490',
        ringOpacity: 0.55,
        swUnder: 12,
        swMid: 6,
        swMain: 6.5,
        shadowBlur: 5,
        swCentre: 3.5,
        swRing: 2.5,
      }
    : {
        underlay: 'rgba(53,180,211,0.28)',
        mid: 'rgba(0,206,206,0.45)',
        main: '#35B4D3',
        shadow: 'rgba(53,180,211,0.55)',
        centreFill: '#0c0c12',
        centreStroke: '#5ec8e8',
        ring: '#7dd3f0',
        ringOpacity: 0.62,
        swUnder: 11,
        swMid: 5.5,
        swMain: 6.5,
        shadowBlur: 6,
        swCentre: 3.8,
        swRing: 3.5,
      }
}

export interface GridPatternStrokeColors {
  minorColor: string
  majorColor: string
  minorStrokeW: number
  majorStrokeW: number
}

export function getGridPatternStrokeColors(isLight: boolean): GridPatternStrokeColors {
  return {
    minorColor: isLight ? 'rgba(0,0,0,0.32)' : 'rgba(255,255,255,0.32)',
    majorColor: isLight ? 'rgba(0,0,0,0.58)' : 'rgba(255,255,255,0.58)',
    minorStrokeW: 1,
    majorStrokeW: isLight ? 1.45 : 1.55,
  }
}
