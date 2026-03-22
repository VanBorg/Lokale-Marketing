import type { Floor } from '../../types';

interface TabPlattegrondModalsProps {
  wallEditExitConfirmOpen: boolean;
  cancelExitWallEdit: () => void;
  confirmExitWallEditToOverview: () => void;
  deleteRoomObj: { name: string } | null | undefined;
  deleteRoomId: string | null;
  setDeleteRoomId: (id: string | null) => void;
  onDeleteRoom: (id: string) => void;
  deleteMultipleRoomIds: Set<string> | null;
  deleteMultipleRoomsCount: number;
  setDeleteMultipleRoomIds: (ids: Set<string> | null) => void;
  onDeleteRooms: (ids: Set<string>) => void;
  deleteFloorObj: Floor | null | undefined;
  deleteFloorId: string | null;
  setDeleteFloorId: (id: string | null) => void;
  onDeleteFloor: (floorId: string) => void;
}

export default function TabPlattegrondModals({
  wallEditExitConfirmOpen,
  cancelExitWallEdit,
  confirmExitWallEditToOverview,
  deleteRoomObj,
  deleteRoomId,
  setDeleteRoomId,
  onDeleteRoom,
  deleteMultipleRoomIds,
  deleteMultipleRoomsCount,
  setDeleteMultipleRoomIds,
  onDeleteRooms,
  deleteFloorObj,
  deleteFloorId,
  setDeleteFloorId,
  onDeleteFloor,
}: TabPlattegrondModalsProps) {
  return (
    <>
      {wallEditExitConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={cancelExitWallEdit}
          role="dialog"
          aria-modal="true"
          aria-labelledby="wall-edit-exit-title"
        >
          <div
            className="rounded-xl bg-dark-card border border-dark-border p-6 shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="wall-edit-exit-title" className="text-base font-semibold text-light mb-2">
              Klaar met bewerken?
            </h3>
            <p className="text-sm text-light/70 mb-6 leading-relaxed">
              Je verliest de huidige muurselectie op de plattegrond. Wil je terug naar het overzicht of doorbouwen?
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={cancelExitWallEdit}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-medium bg-dark-hover text-light/80 border border-dark-border hover:text-light hover:border-light/25 transition-colors cursor-pointer"
              >
                Nee, blijven bouwen
              </button>
              <button
                type="button"
                onClick={confirmExitWallEditToOverview}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-semibold bg-accent text-white border border-accent/80 hover:bg-accent/90 shadow-sm transition-colors cursor-pointer"
              >
                Ja, naar de plattegrond
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteRoomObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteRoomId(null)}>
          <div className="rounded-xl bg-dark-card border border-dark-border p-5 shadow-xl max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-light/90 mb-4">
              Weet je zeker dat je <span className="font-medium text-light">{deleteRoomObj.name}</span> wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteRoomId(null)} className="px-4 py-2 rounded-lg text-sm font-medium bg-dark-hover text-light/60 border border-dark-border hover:text-light transition-colors cursor-pointer">
                Nee
              </button>
              <button
                onClick={() => { onDeleteRoom(deleteRoomId!); setDeleteRoomId(null); }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors cursor-pointer"
              >
                Ja, verwijderen
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteMultipleRoomIds && deleteMultipleRoomsCount > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setDeleteMultipleRoomIds(null)}
        >
          <div
            className="rounded-xl bg-dark-card border border-dark-border p-5 shadow-xl max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-light/90 mb-4">
              Weet je zeker dat je{' '}
              <span className="font-medium text-light">{deleteMultipleRoomsCount}</span>{' '}
              kamers wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteMultipleRoomIds(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-dark-hover text-light/60 border border-dark-border hover:text-light transition-colors cursor-pointer"
              >
                Nee
              </button>
              <button
                onClick={() => {
                  if (deleteMultipleRoomIds) {
                    onDeleteRooms(deleteMultipleRoomIds);
                  }
                  setDeleteMultipleRoomIds(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors cursor-pointer"
              >
                Ja, verwijderen
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteFloorObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteFloorId(null)}>
          <div className="rounded-xl bg-dark-card border border-dark-border p-5 shadow-xl max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-light mb-2">Etage verwijderen</h3>
            <p className="text-sm text-light/70 mb-4">
              Weet je zeker dat je &apos;{deleteFloorObj.name}&apos; wilt verwijderen?
              Alle kamers op deze etage worden ook verwijderd.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteFloorId(null)} className="px-4 py-2 rounded-lg text-sm font-medium bg-dark-hover text-light/60 border border-dark-border hover:text-light transition-colors cursor-pointer">
                Nee, annuleren
              </button>
              <button
                onClick={() => { onDeleteFloor(deleteFloorId!); setDeleteFloorId(null); }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors cursor-pointer"
              >
                Ja, verwijderen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
