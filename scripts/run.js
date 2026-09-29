/**
 * Runs a package script for one workspace, without invoking `npm` again.
 *
 *   node scripts/run.js <workspace> <script> [extra args...]
 *
 * Example: node scripts/run.js backend test
 */
const { spawn } = require('child_process');
const path = require('path');
const { ROOT, withBinOnPath, readWorkspaceScript } = require('./lib');

const [workspace, scriptName, ...extra] = process.argv.slice(2);

if (!workspace || !scriptName) {
  console.error('Usage: node scripts/run.js <workspace> <script> [args...]');
  process.exit(1);
}

let command;
try {
  command = readWorkspaceScript(workspace, scriptName);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (extra.length > 0) {
  command = `${command} ${extra.join(' ')}`;
}

const child = spawn(command, {
  cwd: path.join(ROOT, workspace),
  env: withBinOnPath(),
  shell: true,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  process.exit(signal ? 1 : (code ?? 0));
});

child.on('error', (error) => {
  console.error(`Failed to run "${scriptName}" in ${workspace}: ${error.message}`);
  process.exit(1);
});
