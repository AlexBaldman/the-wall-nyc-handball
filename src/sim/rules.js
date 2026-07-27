import { BALL, COURT, isInsideCourt } from './court.js';

export const MATCH_TARGET_SCORE = 5;

export function createMatchState(overrides = {}) {
  return {
    active: Boolean(overrides.active),
    phase: overrides.phase ?? 'ready',
    targetScore: overrides.targetScore ?? MATCH_TARGET_SCORE,
    scores: {
      player: Math.max(0, Math.trunc(overrides.scores?.player ?? 0)),
      ai: Math.max(0, Math.trunc(overrides.scores?.ai ?? 0)),
    },
    server: overrides.server ?? 'player',
    expectedHitter: overrides.expectedHitter ?? null,
    lastHitter: overrides.lastHitter ?? null,
    serveFaults: Math.max(0, Math.trunc(overrides.serveFaults ?? 0)),
    rallyContacts: Math.max(0, Math.trunc(overrides.rallyContacts ?? 0)),
    wallContactsAtHit: Math.max(0, Math.trunc(overrides.wallContactsAtHit ?? 0)),
    floorBouncesAtHit: Math.max(0, Math.trunc(overrides.floorBouncesAtHit ?? 0)),
    wallReached: Boolean(overrides.wallReached),
    bouncesAfterWall: Math.max(0, Math.trunc(overrides.bouncesAfterWall ?? 0)),
    serveInFlight: Boolean(overrides.serveInFlight),
    pointWinner: overrides.pointWinner ?? null,
    pointReason: overrides.pointReason ?? null,
    matchWinner: overrides.matchWinner ?? null,
  };
}

export function opponentOf(actorId) {
  return actorId === 'player' ? 'ai' : 'player';
}

export function isLegalServeBounce(position) {
  return (
    isInsideCourt(position.x, position.z, BALL.radius)
    && position.z >= COURT.shortLine + BALL.radius
    && position.z <= COURT.longLine - BALL.radius
  );
}

export function beginPoint(match) {
  return {
    ...match,
    active: true,
    phase: 'serve-ready',
    expectedHitter: match.server,
    lastHitter: null,
    rallyContacts: 0,
    wallContactsAtHit: 0,
    floorBouncesAtHit: 0,
    wallReached: false,
    bouncesAfterWall: 0,
    serveInFlight: false,
    pointWinner: null,
    pointReason: null,
    matchWinner: null,
  };
}

export function registerLegalContact(match, hitter, ball) {
  return {
    ...match,
    active: true,
    phase: 'rally',
    expectedHitter: opponentOf(hitter),
    lastHitter: hitter,
    rallyContacts: match.rallyContacts + 1,
    wallContactsAtHit: ball.wallContacts,
    floorBouncesAtHit: ball.floorBounces,
    wallReached: false,
    bouncesAfterWall: 0,
    serveInFlight: match.phase === 'serve-ready' || match.phase === 'serve-toss',
  };
}

export function registerWallContact(match) {
  if (!match.lastHitter) return match;
  return {
    ...match,
    wallReached: true,
    phase: match.serveInFlight ? 'serve-bounce' : 'rally',
  };
}

export function registerFloorContact(match, position) {
  if (!match.lastHitter) {
    if (match.phase === 'serve-toss') {
      return {
        match,
        verdict: {
          winner: null,
          reason: 'serve-down',
          serveFault: true,
        },
      };
    }
    return { match, verdict: null };
  }

  if (!match.wallReached) {
    if (match.serveInFlight) {
      return {
        match,
        verdict: {
          winner: null,
          reason: 'serve-down',
          serveFault: true,
        },
      };
    }
    return {
      match,
      verdict: {
        winner: opponentOf(match.lastHitter),
        reason: 'floor-before-wall',
      },
    };
  }

  if (match.serveInFlight && match.bouncesAfterWall === 0) {
    if (!isLegalServeBounce(position)) {
      const outside = !isInsideCourt(position.x, position.z, BALL.radius);
      return {
        match,
        verdict: {
          winner: null,
          reason: outside
            ? 'outside-serve'
            : position.z < COURT.shortLine
              ? 'short-serve'
              : 'long-serve',
          serveFault: true,
        },
      };
    }
    return {
      match: {
        ...match,
        serveInFlight: false,
        bouncesAfterWall: 1,
        phase: 'rally',
      },
      verdict: null,
    };
  }

  if (!isInsideCourt(position.x, position.z, BALL.radius)) {
    return {
      match,
      verdict: {
        winner: opponentOf(match.lastHitter),
        reason: 'bounce-out',
      },
    };
  }

  const nextBounceCount = match.bouncesAfterWall + 1;
  if (nextBounceCount >= 2) {
    return {
      match,
      verdict: {
        winner: match.lastHitter,
        reason: 'second-bounce',
      },
    };
  }

  return {
    match: {
      ...match,
      bouncesAfterWall: nextBounceCount,
    },
    verdict: null,
  };
}

export function resolveServeFault(match, reason) {
  const nextFaults = match.serveFaults + 1;
  if (nextFaults < 2) {
    return {
      match: {
        ...match,
        active: false,
        phase: 'serve-fault',
        serveFaults: nextFaults,
        expectedHitter: match.server,
        serveInFlight: false,
        wallReached: false,
        bouncesAfterWall: 0,
        pointReason: reason,
      },
      point: null,
    };
  }

  const receiver = opponentOf(match.server);
  return {
    match: {
      ...match,
      active: false,
      phase: 'point',
      server: receiver,
      serveFaults: 0,
      expectedHitter: null,
      serveInFlight: false,
      wallReached: false,
      bouncesAfterWall: 0,
      pointWinner: receiver,
      pointReason: 'double-fault',
    },
    point: {
      winner: receiver,
      reason: 'double-fault',
      scored: false,
      sideOut: true,
    },
  };
}

export function awardRally(match, winner, reason) {
  const scored = winner === match.server;
  const scores = { ...match.scores };
  if (scored) scores[winner] += 1;
  const nextServer = scored ? match.server : winner;
  const matchWinner = scores[winner] >= match.targetScore ? winner : null;

  return {
    match: {
      ...match,
      active: false,
      phase: matchWinner ? 'match-over' : 'point',
      scores,
      server: nextServer,
      expectedHitter: null,
      serveFaults: 0,
      serveInFlight: false,
      pointWinner: winner,
      pointReason: reason,
      matchWinner,
    },
    point: {
      winner,
      reason,
      scored,
      sideOut: !scored,
      matchWinner,
    },
  };
}
