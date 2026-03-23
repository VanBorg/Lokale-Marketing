const SNAP_THRESHOLD = 15;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function snapPosition(
  dragging: Rect,
  others: Rect[],
): { x: number; y: number } {
  let bestX = dragging.x;
  let bestY = dragging.y;
  let minDx = SNAP_THRESHOLD + 1;
  let minDy = SNAP_THRESHOLD + 1;

  const dragEdges = {
    left: dragging.x,
    right: dragging.x + dragging.width,
    top: dragging.y,
    bottom: dragging.y + dragging.height,
  };

  for (const other of others) {
    const otherEdges = {
      left: other.x,
      right: other.x + other.width,
      top: other.y,
      bottom: other.y + other.height,
    };

    const xSnaps = [
      { from: dragEdges.left, to: otherEdges.right, offset: 0 },
      { from: dragEdges.right, to: otherEdges.left, offset: -dragging.width },
      { from: dragEdges.left, to: otherEdges.left, offset: 0 },
      { from: dragEdges.right, to: otherEdges.right, offset: -(dragging.width) },
    ];

    const ySnaps = [
      { from: dragEdges.top, to: otherEdges.bottom, offset: 0 },
      { from: dragEdges.bottom, to: otherEdges.top, offset: -dragging.height },
      { from: dragEdges.top, to: otherEdges.top, offset: 0 },
      { from: dragEdges.bottom, to: otherEdges.bottom, offset: -(dragging.height) },
    ];

    for (const s of xSnaps) {
      const d = Math.abs(s.from - s.to);
      if (d < minDx) {
        minDx = d;
        bestX = s.to + s.offset;
      }
    }

    for (const s of ySnaps) {
      const d = Math.abs(s.from - s.to);
      if (d < minDy) {
        minDy = d;
        bestY = s.to + s.offset;
      }
    }
  }

  return {
    x: minDx <= SNAP_THRESHOLD ? bestX : dragging.x,
    y: minDy <= SNAP_THRESHOLD ? bestY : dragging.y,
  };
}
