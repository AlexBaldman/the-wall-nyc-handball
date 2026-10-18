// Presentation/assist preference, entirely separate from opponent skill.
// Only the hand-start planner changes: the swept contact collider is unchanged.
export const ASSISTANCE_PROFILES = Object.freeze({
  guided: Object.freeze({
    id: 'guided',
    label: 'Guided',
    description: 'Extra preparation tolerance and the optional court guide.',
    handAssist: 'novice',
  }),
  street: Object.freeze({
    id: 'street',
    label: 'Street',
    description: 'Standard, bounded contact assistance.',
    handAssist: 'canonical',
  }),
  pure: Object.freeze({
    id: 'pure',
    label: 'Pure',
    description: 'No automatic hand-start correction. Physical contact only.',
    handAssist: 'none',
  }),
});

export function resolveAssistanceProfile(id) {
  return ASSISTANCE_PROFILES[id] ?? ASSISTANCE_PROFILES.guided;
}

export function resolveHandAssistConfig(id, sportPack) {
  const profile = resolveAssistanceProfile(id);
  if (profile.handAssist === 'novice') return sportPack.noviceHandAssist;
  if (profile.handAssist === 'canonical') return sportPack.handAssist;
  return null;
}
