/**
 * First-run setup.
 *
 * Creates `backend/.env` from the template with freshly generated secrets so a
 * fresh clone runs with `npm run dev` and no manual configuration. Existing files
 * are never overwritten.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const net = require('net');

const backendDir = path.join(__dirname, '..');
const envPath = path.join(backendDir, '.env');
const templatePath = path.join(backendDir, '.env.example');

const isPortFree = (port) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });

async function main() {
  if (fs.existsSync(envPath)) {
    console.log('[setup] backend/.env already exists - leaving it untouched.');
    return;
  }

  if (!fs.existsSync(templatePath)) {
    console.error('[setup] backend/.env.example is missing; cannot create .env.');
    process.exitCode = 1;
    return;
  }

  const template = fs.readFileSync(templatePath, 'utf8');
  const portFree = await isPortFree(27017);

  const contents = template
    .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${crypto.randomBytes(48).toString('hex')}`)
    .replace(/^ENCRYPTION_KEY=.*$/m, `ENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}`)
    .replace(
      /^ENCRYPTION_PASSPHRASE=.*$/m,
      `ENCRYPTION_PASSPHRASE=${crypto.randomBytes(32).toString('hex')}`,
    );

  fs.writeFileSync(envPath, contents, 'utf8');
  console.log('[setup] Created backend/.env with freshly generated secrets.');
  console.log('[setup]   JWT_SECRET        - 48 random bytes (hex)');
  console.log('[setup]   ENCRYPTION_KEY    - 32 random bytes (hex)');

  if (portFree) {
    console.log('');
    console.log('[setup] No MongoDB is listening on 127.0.0.1:27017.');
    console.log('[setup] Either start MongoDB, or point MONGODB_URI in backend/.env at MongoDB Atlas.');
  } else {
    console.log('[setup] MongoDB detected on 127.0.0.1:27017.');
  }

  console.log('');
  console.log('[setup] Done. Start everything with:  npm run dev');
}

main().catch((error) => {
  console.error('[setup] Failed:', error.message);
  process.exitCode = 1;
});
