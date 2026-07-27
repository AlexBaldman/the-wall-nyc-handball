import { createCourtProjection } from '../presentation/court-projection.js';

export const GAMEPLAY_SEED = 0x57414c4c;

export const COURT = createCourtProjection({
  left: 208,
  right: 752,
  wallTop: 58,
  frontWall: 142,
  longLine: 532,
  floorBottom: 590,
  wallHeight: 184,
});

export const PHYSICS = Object.freeze({
  gravity: 1650,
  bounceLoss: 0.84,
  wallLoss: 0.9,
  sideLoss: 0.88,
  airDrag: 0.14,
  curveAcceleration: 92,
  knuckleAcceleration: 58,
  knuckleLift: 22,
  fixedStep: 1 / 120,
  maxSubsteps: 5,
  crackHeight: 13,
});

export const CAMERA_MODES = Object.freeze([
  { id: 'broadcast', label: 'Broadcast', baseZoom: 1, yScale: 1, shear: 0 },
  { id: 'player', label: 'Player', baseZoom: 1.1, yScale: 0.84, shear: 0 },
  { id: 'follow', label: 'Follow', baseZoom: 1.2, yScale: 0.9, shear: 0 },
  { id: 'courtside', label: 'Courtside', baseZoom: 1.28, yScale: 0.8, shear: -0.09 },
]);

export const RHYTHM_PRESETS = Object.freeze({
  study: {
    label: 'Slow Study',
    masterTempo: 0.68,
    ballClock: 0.82,
    footworkClock: 0.88,
    readWindow: 1.36,
    cameraDepth: 1.18,
  },
  real: {
    label: 'Real Court',
    masterTempo: 0.82,
    ballClock: 0.9,
    footworkClock: 0.94,
    readWindow: 1.18,
    cameraDepth: 1.12,
  },
  tournament: {
    label: 'Tournament',
    masterTempo: 0.96,
    ballClock: 1,
    footworkClock: 1,
    readWindow: 1.03,
    cameraDepth: 1.06,
  },
  afterdark: {
    label: 'After Dark',
    masterTempo: 1.08,
    ballClock: 1.06,
    footworkClock: 1.05,
    readWindow: 0.92,
    cameraDepth: 1,
  },
});

export const VENUES = Object.freeze([
  {
    id: 'west4',
    label: 'West 4th · The Cage',
    wallTop: '#c7663f',
    wallBottom: '#8e382c',
    floorTop: '#c9895e',
    floorBottom: '#79513f',
    skyTop: '#284d62',
    skyBottom: '#f3b15e',
  },
  {
    id: 'coney',
    label: 'Coney Island · Seaside',
    wallTop: '#3d8f9b',
    wallBottom: '#245b6a',
    floorTop: '#d4a76e',
    floorBottom: '#87624f',
    skyTop: '#4c8ea4',
    skyBottom: '#ffd38a',
  },
  {
    id: 'venice',
    label: 'Venice Beach · Ocean Front',
    wallTop: '#ed6b79',
    wallBottom: '#9d3e68',
    floorTop: '#c39a79',
    floorBottom: '#6f5a59',
    skyTop: '#5664a7',
    skyBottom: '#ff9f86',
  },
]);
