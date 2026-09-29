/* Boots an ephemeral MongoDB + the compiled API on port 4000 so the built
   frontend can be exercised end-to-end in a browser. */
const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');

(async () => {
  const mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri('medichain-dev');

  const server = spawn(process.execPath, [path.join(__dirname, '..', 'dist', 'server.js')], {
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: '4000',
      MONGODB_URI: uri,
      JWT_SECRET: 'local-dev-secret-value-that-is-long-enough-for-hs256-xyz',
      ENCRYPTION_KEY: 'd'.repeat(64),
      SUI_PACKAGE_ID: '',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      CORS_ORIGIN: 'http://localhost:5173,http://localhost:4173',
      LOG_LEVEL: 'warn',
    },
    stdio: 'inherit',
  });

  const shutdown = async () => {
    server.kill();
    await sleep(300);
    await mongo.stop();
    process.exit(0);
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();
