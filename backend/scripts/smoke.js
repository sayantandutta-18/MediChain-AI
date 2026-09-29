/* Smoke test: boots the compiled server against an ephemeral MongoDB and walks
   the full record -> consent -> verification flow over real HTTP. */
const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');

const API = 'http://127.0.0.1:4111/api/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const call = async (method, url, { token, body, raw } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (raw) return res;
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
};

const upload = async (token, title, content) => {
  const form = new FormData();
  form.append('file', new Blob([content], { type: 'text/plain' }), 'report.txt');
  form.append('title', title);
  form.append('category', 'lab-report');
  const res = await fetch(`${API}/records`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return { status: res.status, json: await res.json() };
};

const check = (label, condition, extra = '') => {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${extra ? ` :: ${extra}` : ''}`);
  if (!condition) process.exitCode = 1;
};

(async () => {
  const mongo = await MongoMemoryServer.create();
  const server = spawn(process.execPath, [path.join(__dirname, '..', 'dist', 'server.js')], {
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: '4111',
      MONGODB_URI: mongo.getUri('medichain-smoke'),
      JWT_SECRET: 'smoke-test-secret-value-long-enough-for-hs256-abcdef',
      ENCRYPTION_KEY: 'c'.repeat(64),
      SUI_PACKAGE_ID: '',
      OPENAI_API_KEY: '',
      LOG_LEVEL: 'error',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverLog = '';
  server.stdout.on('data', (d) => (serverLog += d));
  server.stderr.on('data', (d) => (serverLog += d));

  try {
    // wait for boot
    let booted = false;
    for (let i = 0; i < 40; i += 1) {
      try {
        const res = await fetch(`${API}/health`);
        if (res.ok) { booted = true; break; }
      } catch { /* retry */ }
      await sleep(500);
    }
    check('server boots and reports healthy', booted, serverLog.slice(-300));
    if (!booted) return;

    const health = await call('GET', `${API}/health`);
    check('health shows database connected', health.json.data.dependencies.database.connected === true);
    check('health shows blockchain simulated mode', health.json.data.dependencies.blockchain.configured === false);

    // register
    const patient = await call('POST', `${API}/auth/register`, {
      body: { name: 'Smoke Patient', email: 'patient@smoke.dev', password: 'Str0ngPass!23', role: 'patient' },
    });
    check('patient registers', patient.status === 201 && !!patient.json.data.token);
    const pToken = patient.json.data.token;

    const doctor = await call('POST', `${API}/auth/register`, {
      body: { name: 'Smoke Doctor', email: 'doctor@smoke.dev', password: 'Str0ngPass!23', role: 'doctor', specialty: 'Cardiology' },
    });
    check('doctor registers', doctor.status === 201);
    const dToken = doctor.json.data.token;
    const patientId = patient.json.data.user.id;

    // upload
    const uploaded = await upload(pToken, 'Smoke Lab Report', 'Haemoglobin 13.2 g/dL. WBC 6.1.');
    check('record uploads', uploaded.status === 201, JSON.stringify(uploaded.json).slice(0, 200));
    const record = uploaded.json.data.record;
    check('record is hashed with sha-256', /^[0-9a-f]{64}$/.test(record.fileHash));
    check('record is anchored (simulated)', ['ANCHORED', 'SIMULATED'].includes(record.blockchain.status));

    // unauthorized read
    const denied = await call('GET', `${API}/records/${record.recordId}`, { token: dToken });
    check('doctor denied before consent (403)', denied.status === 403, denied.json?.error?.code);

    // request + approve
    const req = await call('POST', `${API}/access-requests`, {
      token: dToken,
      body: { patientId, reason: 'Reviewing the latest blood panel for follow-up.' },
    });
    check('doctor requests access', req.status === 201);

    const decided = await call('POST', `${API}/access-requests/${req.json.data.accessRequest.id}/decision`, {
      token: pToken,
      body: { action: 'APPROVE', durationDays: 3 },
    });
    check('patient approves with expiry', decided.status === 200 && decided.json.data.accessRequest.expiresAt);

    const allowed = await call('GET', `${API}/records/${record.recordId}`, { token: dToken });
    check('approved doctor can read (200)', allowed.status === 200);

    // download decrypts
    const dl = await call('GET', `${API}/records/${record.recordId}/download`, { token: dToken, raw: true });
    const text = await dl.text();
    check('download returns decrypted original', dl.status === 200 && text.includes('Haemoglobin 13.2'));

    // verify
    const ver = await call('GET', `${API}/records/${record.recordId}/verify`, { token: pToken });
    check('verification reports digests match', ver.json.data.verification.match === true, ver.json.data.verification.status);

    // doctor cannot mutate
    const del = await call('DELETE', `${API}/records/${record.recordId}`, { token: dToken });
    check('doctor cannot delete patient record (403)', del.status === 403);

    // revoke
    const revoke = await call('POST', `${API}/access-requests/${req.json.data.accessRequest.id}/revoke`, {
      token: pToken, body: { reason: 'done' },
    });
    check('patient revokes access', revoke.status === 200);

    const afterRevoke = await call('GET', `${API}/records/${record.recordId}`, { token: dToken });
    check('revoked doctor denied (403)', afterRevoke.status === 403);

    // audit
    const audit = await call('GET', `${API}/audit-logs?limit=100`, { token: pToken });
    const actions = audit.json.data.items.map((i) => i.action);
    check('audit trail recorded actions', actions.includes('record.upload') && actions.includes('access.approve'));

    // AI controlled error
    const ai = await call('POST', `${API}/ai/analyze`, { token: pToken, body: { recordId: record.recordId } });
    check('AI returns controlled 503 when unconfigured', ai.status === 503 && ai.json.error.code === 'AI_NOT_CONFIGURED');

    // security headers
    const raw = await fetch(`${API}/health`, { method: 'GET' });
    check('helmet sets x-content-type-options', raw.headers.get('x-content-type-options') === 'nosniff');
    check('helmet sets frame protection', raw.headers.get('x-frame-options') !== null);

    // 404 shape
    const nf = await call('GET', `${API}/nope`);
    check('unknown route returns structured 404', nf.status === 404 && nf.json.error.code === 'ROUTE_NOT_FOUND');
  } finally {
    server.kill();
    await sleep(300);
    await mongo.stop();
  }

  console.log(process.exitCode ? '\nSMOKE TEST: FAILURES PRESENT' : '\nSMOKE TEST: ALL CHECKS PASSED');
})();
