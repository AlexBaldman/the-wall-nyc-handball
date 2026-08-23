import { deriveContactMetrics } from '../../sim/contact-metrics.js';
import * as rules from '../../sim/rules.js';
import { ONE_WALL_HANDBALL_PHYSICS } from './physics-profile.js';
import { classifyHandballContact } from './outcome-classifier.js';

function classifyContact(contact, actorPosition) {
  const metrics = deriveContactMetrics(contact, actorPosition);
  return classifyHandballContact(contact, metrics);
}

export const ONE_WALL_HANDBALL = Object.freeze({
  id: 'american-handball-one-wall',
  label: 'American One-Wall Handball',
  physics: ONE_WALL_HANDBALL_PHYSICS,
  rules,
  deriveContactMetrics,
  classifyContact,
});
