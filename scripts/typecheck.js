/**
 * Strict TypeScript check for every workspace, without invoking `npm` again.
 *
 *   node scripts/typecheck.js
 */
const { spawnSync } = require('child_process');
const path = require('path');
const { ROOT, withBinOnPath, readWorkspaceScript } = require('./lib');

const workspaces = ['backend', 'frontend'];
const failed = [];

for (const workspace of workspaces) {
  let command;
  try {
    command = readWorkspaceScript(workspace, 'typecheck');
  } catch (error) {
    console.error(error.message);
    failed.push(workspace);
    continue;
  }

  console.log(`\n[${workspace}] ${command}\n`);

  const result = spawnSync(command, {
    cwd: path.join(ROOT, workspace),
    env: withBinOnPath(),
    shell: true,
    stdio: 'inherit',
  });

  if (result.status !== 0) failed.push(workspace);
}

if (failed.length > 0) {
  console.error(`\nTypecheck failed in: ${failed.join(', ')}`);
  process.exit(1);
}

console.log('\nTypecheck passed for backend and frontend.');
