import { deriveContactOutcome } from '../../sim/contact-outcome.js';
import * as rules from '../../sim/rules.js';
import { ONE_WALL_HANDBALL_PHYSICS } from './physics-profile.js';

export const ONE_WALL_HANDBALL = Object.freeze({
  id: 'american-handball-one-wall',
  label: 'American One-Wall Handball',
  physics: ONE_WALL_HANDBALL_PHYSICS,
  rules,
  classifyContact: deriveContactOutcome,
});
