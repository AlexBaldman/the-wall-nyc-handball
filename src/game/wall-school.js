const DRILLS = {
  clean: {
    id: 'clean',
    label: 'Clean three',
    goal: 3,
    instruction: 'Build a three-contact streak with balanced spacing and at least a Set preparation.',
    passes: (outcome) => outcome.quality?.pure,
  },
  pace: {
    id: 'pace',
    label: 'Loaded pace',
    goal: 3,
    instruction: 'Meet three balls cleanly at 38 mph or more. Hold through the plateau, then release.',
    passes: (outcome) => outcome.quality?.pure && outcome.paceMph >= 38,
  },
  spin: {
    id: 'spin',
    label: 'Spin shape',
    goal: 3,
    instruction: 'Create three clean returns above 650 rpm. English and technique both count.',
    passes: (outcome) => outcome.quality?.pure && outcome.spinRpm >= 650,
  },
};

export function getWallSchoolDrill(id = 'clean') {
  return DRILLS[id] ?? DRILLS.clean;
}

export function createWallSchoolState(id = 'clean') {
  const drill = getWallSchoolDrill(id);
  return {
    active: false,
    completed: false,
    drillId: drill.id,
    progress: 0,
    attempts: 0,
  };
}

export function scoreWallSchoolContact(state, outcome) {
  const drill = getWallSchoolDrill(state.drillId);
  if (!state.active || state.completed) return { state, result: null };

  const passed = drill.passes(outcome);
  const progress = passed ? state.progress + 1 : 0;
  const completed = progress >= drill.goal;
  return {
    state: {
      ...state,
      progress,
      completed,
      attempts: state.attempts + 1,
    },
    result: {
      passed,
      completed,
      goal: drill.goal,
      progress,
    },
  };
}
