import { COURT, courtRatios } from '../sim/court.js';

const finite = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new TypeError(`${label} must be a finite number`);
  }
  return number;
};

export function createCourtProjection({
  left,
  right,
  wallTop,
  frontWall,
  longLine,
  floorBottom,
  wallHeight,
}) {
  const frame = {
    left: finite(left, 'left'),
    right: finite(right, 'right'),
    top: finite(wallTop, 'wallTop'),
    frontWallY: finite(frontWall, 'frontWall'),
    backLineY: finite(longLine, 'longLine'),
    bottom: finite(floorBottom, 'floorBottom'),
    wallHeightZ: finite(wallHeight, 'wallHeight'),
  };

  if (frame.right <= frame.left) {
    throw new RangeError('right must be greater than left');
  }
  if (frame.frontWallY <= frame.top) {
    throw new RangeError('frontWall must be below wallTop');
  }
  if (frame.backLineY <= frame.frontWallY) {
    throw new RangeError('longLine must be behind the front wall');
  }
  if (frame.bottom < frame.backLineY) {
    throw new RangeError('floorBottom cannot be inside the regulation court');
  }

  const depth = frame.backLineY - frame.frontWallY;
  const ratios = courtRatios();

  return Object.freeze({
    ...frame,
    shortLineY: Math.round(frame.frontWallY + depth * ratios.shortLine),
    serviceLineY: Math.round(frame.frontWallY + depth * ratios.serviceMarkers),
    centerX: (frame.left + frame.right) / 2,
    serviceMarkerLength: (
      (frame.right - frame.left)
      * COURT.serviceMarkerLength
      / COURT.width
    ),
  });
}
