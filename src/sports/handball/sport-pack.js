import { deriveContactMetrics } from '../../sim/contact-metrics.js';
import {
  HANDBALL_HAND_ASSIST,
  planHandStartAssist,
} from './hand-assist.js';
import {
  advanceCueStability,
  createCueStabilityState,
  deriveHandballFootworkGuidance,
} from './intercept-guidance.js';
import {
  HANDBALL_CONTACT_ENVELOPE,
  HANDBALL_PLAYER_MOVEMENT,
  planHandballIntercept,
} from './intercept-planner.js';
import {
  createInterceptTelemetry,
  recordInterceptTelemetry,
  summarizeInterceptTelemetry,
} from './intercept-telemetry.js';
import { ONE_WALL_HANDBALL_PHYSICS } from './physics-profile.js';
import { classifyHandballContact } from './outcome-classifier.js';
import * as rules from './rules.js';

function classifyContact(contact, actorPosition) {
  const metrics = deriveContactMetrics(contact, actorPosition);
  return classifyHandballContact(contact, metrics);
}

export const ONE_WALL_HANDBALL = Object.freeze({
  id: 'american-handball-one-wall',
  label: 'American One-Wall Handball',
  physics: ONE_WALL_HANDBALL_PHYSICS,
  rules,
  movement: HANDBALL_PLAYER_MOVEMENT,
  contactEnvelope: HANDBALL_CONTACT_ENVELOPE,
  handAssist: HANDBALL_HAND_ASSIST,
  deriveContactMetrics,
  classifyContact,
  planIntercept: planHandballIntercept,
  planHandStart: planHandStartAssist,
  guideFootwork: deriveHandballFootworkGuidance,
  createCueState: createCueStabilityState,
  stabilizeCue: advanceCueStability,
  createCoachTelemetry: createInterceptTelemetry,
  recordCoachTelemetry: recordInterceptTelemetry,
  summarizeCoachTelemetry: summarizeInterceptTelemetry,
});
