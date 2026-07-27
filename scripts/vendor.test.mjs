import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const projectRoot = new URL('../', import.meta.url);
const packageJson = JSON.parse(readFileSync(new URL('package.json', projectRoot), 'utf8'));
const installedThree = JSON.parse(
  readFileSync(new URL('node_modules/three/package.json', projectRoot), 'utf8'),
);

assert.equal(
  packageJson.devDependencies.three,
  installedThree.version,
  'Three.js must be pinned exactly so vendored runtime assets remain reproducible',
);

const vendoredFiles = [
  ['vendor/three.module.min.js', 'node_modules/three/build/three.module.min.js'],
  ['vendor/three.core.min.js', 'node_modules/three/build/three.core.min.js'],
  ['vendor/THREE-LICENSE.txt', 'node_modules/three/LICENSE'],
];

for (const [vendoredPath, packagePath] of vendoredFiles) {
  assert.deepEqual(
    readFileSync(new URL(vendoredPath, projectRoot)),
    readFileSync(new URL(packagePath, projectRoot)),
    `${vendoredPath} must match Three.js ${installedThree.version}`,
  );
}

console.log(`Vendor checks passed: Three.js ${installedThree.version} assets are exact.`);
