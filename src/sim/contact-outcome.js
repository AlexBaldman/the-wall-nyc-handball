import { deriveContactMetrics } from './contact-metrics.js';
import { classifyHandballContact } from '../sports/handball/outcome-classifier.js';

// Compatibility facade for existing handball callers. New shared systems should
// consume deriveContactMetrics(), while sport packs own their interpretation.
export function deriveContactOutcome(contact, actorPosition) {
  const metrics = deriveContactMetrics(contact, actorPosition);
  return classifyHandballContact(contact, metrics);
}
