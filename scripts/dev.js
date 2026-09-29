/**
 * Development runner for MediChain-AI.
 *
 * Starts the API and the web client together, with no third-party orchestration
 * dependency and without invoking `npm` again (see scripts/lib.js for why).
 *
 *   npm run dev
 */
const { spawn } = require('child_process');
const net = require('net');
const path = require('path');
const fs = require('fs');
const { ROOT: root, withBinOnPath, resolveBin } = require('./lib');

let tsxCli;
let viteCli;
try {
  tsxCli = resolveBin('node_modules/tsx', 'tsx');
  viteCli = resolveBin('node_modules/vite', 'vite');
} catch (error) {
  console.error(`\n${error.message}\n`);
  process.exit(1);
}

const API_PORT = Number(process.env.PORT) || 4000;
const WEB_PORT = 5173;

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = {
  reset: useColor ? '\u001b[0m' : '',
  dim: useColor ? '\u001b[2m' : '',
  bold: useColor ? '\u001b[1m' : '',
  cyan: useColor ? '\u001b[36m' : '',
  blue: useColor ? '\u001b[34m' : '',
  green: useColor ? '\u001b[32m' : '',
  yellow: useColor ? '\u001b[33m' : '',
  red: useColor ? '\u001b[31m' : '',
};

const log = (msg) => console.log(msg);

const isPortInUse = (port) =>
  new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.setTimeout(1200);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    const no = () => {
      socket.destroy();
      resolve(false);
    };
    socket.on('error', no);
    socket.on('timeout', no);
  });

const clean = (chunk) =>
  chunk
    .toString()
    .split(/\r?\n/)
    .filter((line) => line && !/npm (warn|notice)/.test(line) && !/^\s*(\+|\|)/.test(line))
    .join('\n');

const children = [];
let shuttingDown = false;

const shutdown = (code = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`\n${c.dim}Stopping MediChain-AI dev servers...${c.reset}`);
  for (const child of children) {
    if (!child.killed) {
      try {
        child.kill();
      } catch {
        /* already gone */
      }
    }
  }
  setTimeout(() => process.exit(code), 400);
};

/** Spawn one dev server: `node <cli> <args>` inside its workspace directory. */
const start = (label, colour, entry, args, cwd) => {
  const child = spawn(process.execPath, [entry, ...args], {
    cwd,
    env: withBinOnPath({ FORCE_COLOR: useColor ? '1' : '0' }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);

  const pipe = (stream) => {
    stream.on('data', (chunk) => {
      const text = clean(chunk);
      if (!text.trim()) return;
      text.split('\n').forEach((line) => log(`${colour}[${label}]${c.reset} ${line}`));
    });
  };

  pipe(child.stdout);
  pipe(child.stderr);

  child.on('exit', (code) => {
    if (shuttingDown) return;
    log(`${colour}[${label}]${c.reset} exited with code ${code}`);
    if (code !== 0 && code !== null) {
      log(`${c.yellow}[${label}] stopped unexpectedly. Fix the error above, then run "npm run dev" again.${c.reset}`);
    }
    shutdown(code ?? 0);
  });

  return child;
};

const waitForPort = async (port, timeoutMs) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await isPortInUse(port)) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
};

const main = async () => {
  log('');
  log(`${c.bold}${c.cyan}  MediChain-AI${c.reset} ${c.dim}- development environment${c.reset}`);
  log('');

  // 1. Make sure the environment file exists.
  await new Promise((resolve) => {
    const setup = spawn(process.execPath, [path.join(root, 'backend', 'scripts', 'setup.js')], {
      cwd: root,
      stdio: 'inherit',
    });
    setup.on('exit', resolve);
  });

  if (!fs.existsSync(path.join(root, 'backend', '.env'))) {
    log(`${c.red}backend/.env is missing and could not be created.${c.reset}`);
    process.exit(1);
  }

  // 2. Refuse to start on top of something else rather than failing confusingly.
  const conflicts = [];
  if (await isPortInUse(API_PORT)) conflicts.push(API_PORT);
  if (await isPortInUse(WEB_PORT)) conflicts.push(WEB_PORT);

  if (conflicts.length > 0) {
    log('');
    log(
      `${c.red}${c.bold}  Cannot start - port${conflicts.length > 1 ? 's' : ''} already in use: ${conflicts.join(', ')}${c.reset}`,
    );
    log('');
    log('  Something is already listening there.');
    log('');
    log(`  ${c.dim}Option A${c.reset} - it may already be running:  ${c.cyan}http://localhost:${WEB_PORT}${c.reset}`);
    log(`  ${c.dim}Option B${c.reset} - stop it and start cleanly:`);
    log('');
    log('    Get-Process node | Stop-Process -Force');
    log('');
    process.exit(1);
  }

  // 3. Launch both servers directly.
  log(`${c.dim}Starting API on port ${API_PORT} and web client on port ${WEB_PORT}...${c.reset}`);
  log('');

  start('api', c.blue, tsxCli, ['watch', 'src/server.ts'], path.join(root, 'backend'));
  start('web', c.cyan, viteCli, [], path.join(root, 'frontend'));

  const apiReady = await waitForPort(API_PORT, 60_000);
  const webReady = await waitForPort(WEB_PORT, 60_000);

  log('');
  if (apiReady && webReady) {
    log(`${c.green}${c.bold}  Ready.${c.reset}`);
    log('');
    log(`    ${c.bold}Open${c.reset}   ${c.cyan}http://localhost:${WEB_PORT}${c.reset}`);
    log(`    ${c.dim}API          http://localhost:${API_PORT}/api/v1/health${c.reset}`);
    log('');
    log(`  ${c.dim}Register a patient account to get started. Keep this terminal open.${c.reset}`);
    log('');
  } else {
    log(`${c.yellow}  A server did not come up in time - check the log lines above.${c.reset}`);
    log('');
  }
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

main().catch((error) => {
  console.error(`${c.red}Failed to start dev servers:${c.reset}`, error);
  process.exit(1);
});
