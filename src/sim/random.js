export function createSeededRandom(seed = 0x57414c4c) {
  let state = (Number(seed) >>> 0) || 1;

  return {
    next() {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      return state / 0x100000000;
    },
    range(min, max) {
      return min + (max - min) * this.next();
    },
    signed(magnitude = 1) {
      return (this.next() * 2 - 1) * magnitude;
    },
    getState() {
      return state >>> 0;
    },
    setState(nextState) {
      state = (Number(nextState) >>> 0) || 1;
    },
  };
}
