import type { BlueprintDoc } from '../store/blueprintStore'

export interface RoomDetail {
  roomId: string
  wanden: WandData[]
  vloer: VloerData | null
  plafond: PlafondData | null
  openingen: OpeningItem[]
}

export interface WandData {
  wallIndex: number
  material: string
  thickness: number
  loadBearing: boolean
  exterior: boolean
  wetRoom: boolean
}

export interface VloerData {
  vloertype: string
  afwerking: string
  dikte: number
  vloerverwarming: boolean
  vochtkeringNodig: boolean
  bijzonderheden: string
}

export interface PlafondData {
  afwerking: string
  systeemplafond: boolean
  verlaagdeHoogte: number
  spotjes: boolean
  aantalSpots: number
  bijzonderheden: string
}

export interface OpeningItem {
  id: string
  type: string
  breedte: number
  hoogte: number
  aantal: number
  wandIndex: number | null
  bijzonderheid: string
}

export interface EtageData {
  id: string
  naam: string
  type: string
  omschrijving: string
}

export interface ProjectBlueprintData {
  blueprintDoc: BlueprintDoc
  roomDetails: RoomDetail[]
  etages: EtageData[]
  dakbedekking: string
  dakoversteekhoogte: number
  lastSavedAt: string
}

// ─── Placeholder functies — later vervangen door Supabase calls ──────────────

/** Sla blueprint op voor een project. Later: supabase.from('projects').update({ blueprint_data: data }) */
export async function saveBlueprintData(
  projectId: string,
  data: ProjectBlueprintData
): Promise<void> {
  // PLACEHOLDER: sla lokaal op in localStorage als fallback
  try {
    localStorage.setItem(`blueprint_${projectId}`, JSON.stringify(data))
  } catch {
    console.warn('localStorage niet beschikbaar')
  }
  // TODO: vervang door Supabase call:
  // await supabase.from('projects').update({ blueprint_data: data }).eq('id', projectId)
}

/** Laad blueprint voor een project. Later: supabase.from('projects').select('blueprint_data') */
export async function loadBlueprintData(
  projectId: string
): Promise<ProjectBlueprintData | null> {
  // PLACEHOLDER: laad uit localStorage
  try {
    const raw = localStorage.getItem(`blueprint_${projectId}`)
    if (!raw) return null
    return JSON.parse(raw) as ProjectBlueprintData
  } catch {
    return null
  }
  // TODO: vervang door Supabase call:
  // const { data } = await supabase.from('projects').select('blueprint_data').eq('id', projectId).single()
  // return data?.blueprint_data ?? null
}

/** Verwijder blueprint data voor een project. */
export async function deleteBlueprintData(projectId: string): Promise<void> {
  localStorage.removeItem(`blueprint_${projectId}`)
  // TODO: supabase.from('projects').update({ blueprint_data: null }).eq('id', projectId)
}
