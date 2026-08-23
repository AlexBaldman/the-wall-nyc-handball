import { runAllHandballInterceptBenchmarks } from '../src/sports/handball/intercept-benchmarks.js';

console.log(JSON.stringify({
  schemaVersion: 1,
  benchmark: 'handball-intercepts',
  results: runAllHandballInterceptBenchmarks(),
}, null, 2));
