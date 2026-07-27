import {
  PHYSICS_VERSION,
  SIMULATION_SCHEMA_VERSION,
  assertSimulationSnapshot,
  cloneSerializable,
} from './types.js';

export function createReplayRecorder({ seed, label = 'Ball Lab session' }) {
  const replay = {
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    physicsVersion: PHYSICS_VERSION,
    label,
    seed: (Number(seed) >>> 0) || 1,
    commands: [],
    contacts: [],
    checkpoints: [],
  };

  return {
    recordCommand(command) {
      replay.commands.push(cloneSerializable(command));
    },
    recordContact(contact) {
      replay.contacts.push(cloneSerializable(contact));
    },
    checkpoint(snapshot) {
      assertSimulationSnapshot(snapshot);
      replay.checkpoints.push(cloneSerializable(snapshot));
    },
    export() {
      return cloneSerializable(replay);
    },
    clear() {
      replay.commands.length = 0;
      replay.contacts.length = 0;
      replay.checkpoints.length = 0;
    },
  };
}

export function validateReplay(replay) {
  if (replay?.schemaVersion !== SIMULATION_SCHEMA_VERSION) {
    throw new Error(`Replay schema mismatch: ${replay?.schemaVersion}`);
  }
  if (replay.physicsVersion !== PHYSICS_VERSION) {
    throw new Error(`Replay physics mismatch: ${replay.physicsVersion}`);
  }
  if (!Array.isArray(replay.commands) || !Array.isArray(replay.contacts)) {
    throw new Error('Replay command or contact stream is missing.');
  }
  return true;
}
