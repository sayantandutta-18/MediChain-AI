/**
 * Starts a single dev server, without invoking `npm` again.
 *
 *   node scripts/dev-one.js api   -> Express API with watch reload
 *   node scripts/dev-one.js web   -> Vite dev client
 */
const { spawn } = require('child_process');
const path = require('path');
const { ROOT, withBinOnPath, resolveBin } = require('./lib');

const target = (process.argv[2] || '').toLowerCase();

const targets = {
  api: { label: 'api', pkg: 'node_modules/tsx', bin: 'tsx', args: ['watch', 'src/server.ts'], cwd: 'backend' },
  web: { label: 'web', pkg: 'node_modules/vite', bin: 'vite', args: [], cwd: 'frontend' },
};

if (!targets[target]) {
  console.error('Usage: node scripts/dev-one.js <api|web>');
  process.exit(1);
}

const spec = targets[target];

let entry;
try {
  entry = resolveBin(spec.pkg, spec.bin);
} catch (error) {
  console.error(`\n${error.message}\n`);
  process.exit(1);
}

const child = spawn(process.execPath, [entry, ...spec.args], {
  cwd: path.join(ROOT, spec.cwd),
  env: withBinOnPath(),
  stdio: 'inherit',
});

const stop = () => {
  if (!child.killed) child.kill();
  process.exit(0);
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

child.on('exit', (code) => process.exit(code ?? 0));
child.on('error', (error) => {
  console.error(`Failed to start ${spec.label}: ${error.message}`);
  process.exit(1);
});
