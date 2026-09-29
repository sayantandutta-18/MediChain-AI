/**
 * Shared helpers for the MediChain-AI root scripts.
 *
 * Why these exist: on some Windows Node installations there is no `npm.cmd` next
 * to `node.exe` (only `npm` and `npm.ps1`). Any npm script whose body starts with
 * `npm ...` then fails with "'npm' is not recognized", which breaks workspace
 * delegation. So every root script here is plain `node`, and workspace commands
 * are executed directly.
 */
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');

/** Directories npm would normally put on PATH for a script. */
const binPaths = () => {
  const dirs = [
    path.join(ROOT, 'node_modules', '.bin'),
    path.join(ROOT, 'backend', 'node_modules', '.bin'),
    path.join(ROOT, 'frontend', 'node_modules', '.bin'),
  ];
  return dirs.filter((dir) => fs.existsSync(dir));
};

const withBinOnPath = (extra = {}) => ({
  ...process.env,
  ...extra,
  PATH: [...binPaths(), process.env.PATH].filter(Boolean).join(path.delimiter),
});

/**
 * Resolve a locally installed CLI to its JavaScript entry point so it can be run
 * as `node <entry>` (no shell, no `.bin` shim, no `npm`).
 */
const resolveBin = (packageJsonRelativeDir, binName) => {
  const pkgPath = path.join(ROOT, packageJsonRelativeDir, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    throw new Error(`Missing ${packageJsonRelativeDir}/package.json. Run "npm install" in the project root.`);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const entry = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.[binName];

  if (!entry) {
    throw new Error(`Could not resolve the "${binName}" binary from ${packageJsonRelativeDir}/package.json.`);
  }

  const resolved = path.join(ROOT, packageJsonRelativeDir, entry);
  if (!fs.existsSync(resolved)) {
    throw new Error(
      `${binName} is not installed (expected at ${resolved}).\nRun "npm install" in the project root.`,
    );
  }

  return resolved;
};

const readWorkspaceScript = (workspace, scriptName) => {
  const pkgPath = path.join(ROOT, workspace, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`Unknown workspace "${workspace}".`);
  }
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const command = pkg.scripts?.[scriptName];
  if (!command) {
    throw new Error(`"${workspace}" has no "${scriptName}" script.`);
  }
  return command;
};

module.exports = { ROOT, binPaths, withBinOnPath, resolveBin, readWorkspaceScript };
