import EtageTabBar from '../components/EtageTabBar';
import PlattegrondCanvas from '../canvas/PlattegrondCanvas';
import TabPlattegrondModals from './tab-plattegrond/TabPlattegrondModals';
import TabPlattegrondSidebar from './tab-plattegrond/TabPlattegrondSidebar';
import { useTabPlattegrond } from './tab-plattegrond/useTabPlattegrond';
import type { TabPlattegrondProps } from './tab-plattegrond/types';

export type { TabPlattegrondProps } from './tab-plattegrond/types';

export default function TabPlattegrond(props: TabPlattegrondProps) {
  const p = useTabPlattegrond(props);

  return (
    <div className="flex flex-col h-full relative">
      <EtageTabBar
        floors={p.floors}
        activeFloorId={p.activeFloorId}
        onFloorChange={p.handleFloorChange}
        onAddFloor={p.addFloor}
        onDeleteFloor={(id) => p.setDeleteFloorId(id)}
      />

      <div className="flex flex-1 min-h-0">
        <PlattegrondCanvas
          ref={p.canvasRef}
          rooms={p.rooms}
          selectedRoomId={p.selectedRoomId}
          onSelectRoom={p.handleSelectRoom}
          selectedRoomIds={p.selectedRoomIds}
          onSelectedRoomIdsChange={p.setSelectedRoomIds}
          onMoveRoom={p.moveRoom}
          onUpdateRoom={p.updateRoom}
          onUpdateElement={p.updateElement}
          placingElement={p.placingElement}
          onPlaceElement={p.placeElement}
          onCancelPlacing={p.cancelPlacing}
          selectedRoom={p.selectedRoom}
          clipboard={p.clipboard}
          isCut={p.isCut}
          cutRoomId={p.cutRoomId}
          onDuplicate={p.duplicateRoom}
          onCopy={p.copyRoom}
          onCut={p.cutRoom}
          onPaste={p.pasteRoom}
          onMoveRooms={p.moveRooms}
          beginBatch={p.beginBatch}
          endBatch={p.endBatch}
          selectedWallIndices={p.selectedWallIndices}
          shouldConfirmClearRoomSelection={p.shouldConfirmClearRoomSelection}
          onRequestClearRoomSelectionConfirm={p.onRequestClearRoomSelectionConfirm}
          canUndo={p.canUndo}
          canRedo={p.canRedo}
          onUndo={p.onUndo}
          onRedo={p.onRedo}
          pendingSpecialRoom={p.pendingSpecialRoom}
          pendingTargetRoomId={p.pendingTargetRoomId}
          onSelectTargetRoom={p.handleSelectTargetRoom}
          onCancelPendingSpecial={p.cancelPendingSpecial}
          onConfirmPlaceFinalized={p.confirmPlaceOnFinalizedTarget}
          onCancelPlaceFinalized={p.cancelPendingSpecial}
        />

        <TabPlattegrondSidebar
          sidebarRef={p.sidebarRef}
          showFreeFormBuilder={p.showFreeFormBuilder}
          setShowFreeFormBuilder={p.setShowFreeFormBuilder}
          addFreeFormRoom={p.addFreeFormRoom}
          sidebarView={p.sidebarView}
          lastShape={p.lastShape}
          addRoom={p.addRoom}
          selectedRoom={p.selectedRoom}
          updateRoom={p.updateRoom}
          rooms={p.rooms}
          deleteRoom={p.deleteRoom}
          selectedWallIndices={p.selectedWallIndices}
          toggleWallIndex={p.toggleWallIndex}
          setSidebarView={p.setSidebarView}
          setSelectedRoomId={p.setSelectedRoomId}
          startPendingSpecialRoom={p.startPendingSpecialRoom}
          totalRooms={p.totalRooms}
          setActiveTab={p.setActiveTab}
        />
      </div>

      <TabPlattegrondModals
        wallEditExitConfirmOpen={p.wallEditExitConfirmOpen}
        cancelExitWallEdit={p.cancelExitWallEdit}
        confirmExitWallEditToOverview={p.confirmExitWallEditToOverview}
        deleteRoomObj={p.deleteRoomObj}
        deleteRoomId={p.deleteRoomId}
        setDeleteRoomId={p.setDeleteRoomId}
        onDeleteRoom={p.deleteRoom}
        deleteMultipleRoomIds={p.deleteMultipleRoomIds}
        deleteMultipleRoomsCount={p.deleteMultipleRoomsCount}
        setDeleteMultipleRoomIds={p.setDeleteMultipleRoomIds}
        onDeleteRooms={p.deleteRooms}
        deleteFloorObj={p.deleteFloorObj}
        deleteFloorId={p.deleteFloorId}
        setDeleteFloorId={p.setDeleteFloorId}
        onDeleteFloor={p.deleteFloor}
      />
    </div>
  );
}
