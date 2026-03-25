import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  RoomDetail,
  WandData,
  VloerData,
  PlafondData,
  OpeningItem,
  EtageData,
} from '../lib/blueprintPersistence'

interface RoomDetailsState {
  details: Record<string, Partial<RoomDetail>>

  etages: EtageData[]
  dakbedekking: string
  dakoversteekhoogte: number

  setWanden: (roomId: string, wanden: WandData[]) => void
  setVloer: (roomId: string, vloer: VloerData) => void
  setPlafond: (roomId: string, plafond: PlafondData) => void
  setOpeningen: (roomId: string, openingen: OpeningItem[]) => void
  setEtages: (etages: EtageData[]) => void
  setDakbedekking: (value: string) => void
  setDakoversteekhoogte: (value: number) => void

  hydrate: (
    details: Record<string, Partial<RoomDetail>>,
    etages: EtageData[],
    dakbedekking: string,
    dakoversteekhoogte: number,
  ) => void

  reset: () => void

  getAllDetails: () => RoomDetail[]
}

export const useRoomDetailsStore = create<RoomDetailsState>()(
  immer((set, get) => ({
    details: {},
    etages: [{ id: crypto.randomUUID(), naam: 'Begane grond', type: 'begane grond', omschrijving: '' }],
    dakbedekking: 'Dakpannen',
    dakoversteekhoogte: 50,

    setWanden: (roomId, wanden) =>
      set(state => {
        if (!state.details[roomId]) state.details[roomId] = { roomId }
        state.details[roomId].wanden = wanden
      }),

    setVloer: (roomId, vloer) =>
      set(state => {
        if (!state.details[roomId]) state.details[roomId] = { roomId }
        state.details[roomId].vloer = vloer
      }),

    setPlafond: (roomId, plafond) =>
      set(state => {
        if (!state.details[roomId]) state.details[roomId] = { roomId }
        state.details[roomId].plafond = plafond
      }),

    setOpeningen: (roomId, openingen) =>
      set(state => {
        if (!state.details[roomId]) state.details[roomId] = { roomId }
        state.details[roomId].openingen = openingen
      }),

    setEtages: etages =>
      set(state => {
        state.etages = etages
      }),

    setDakbedekking: value =>
      set(state => {
        state.dakbedekking = value
      }),

    setDakoversteekhoogte: value =>
      set(state => {
        state.dakoversteekhoogte = value
      }),

    hydrate: (details, etages, dakbedekking, dakoversteekhoogte) =>
      set(state => {
        state.details = details
        state.etages = etages
        state.dakbedekking = dakbedekking
        state.dakoversteekhoogte = dakoversteekhoogte
      }),

    reset: () =>
      set(state => {
        state.details = {}
        state.etages = [{ id: crypto.randomUUID(), naam: 'Begane grond', type: 'begane grond', omschrijving: '' }]
        state.dakbedekking = 'Dakpannen'
        state.dakoversteekhoogte = 50
      }),

    getAllDetails: () => {
      const { details } = get()
      return Object.values(details).map(d => ({
        roomId: d.roomId ?? '',
        wanden: d.wanden ?? [],
        vloer: d.vloer ?? null,
        plafond: d.plafond ?? null,
        openingen: d.openingen ?? [],
      }))
    },
  })),
)
