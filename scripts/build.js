/**
 * Runs a package script in one or more workspaces sequentially, without invoking
 * `npm` again (see scripts/lib.js for why).
 *
 *   node scripts/build.js            # every workspace
 *   node scripts/build.js backend    # just the backend
 */
const { spawnSync } = require('child_process');
const path = require('path');
const { ROOT, withBinOnPath, readWorkspaceScript } = require('./lib');

const ALL = ['backend', 'frontend'];
const targets = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
const workspaces = targets.length > 0 ? targets : ALL;

const failed = [];

for (const workspace of workspaces) {
  let command;
  try {
    command = readWorkspaceScript(workspace, 'build');
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

  if (result.status !== 0) {
    failed.push(workspace);
  }
}

if (failed.length > 0) {
  console.error(`\nBuild failed in: ${failed.join(', ')}`);
  process.exit(1);
}

console.log('\nBuild succeeded.');
